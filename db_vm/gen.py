# Author: Çağrı Erdem, 2023
# Description: Server-side drum groove generation script for 2groove web app.

import base64
import glob
import io
import json
import os
import random
import re

import numpy as np
import tensorflow as tf
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from keras.layers import Lambda
from keras.models import load_model
from mido import Message, MetaMessage, MidiFile, MidiTrack, bpm2tempo
from sklearn.preprocessing import MinMaxScaler

gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    try:
        # Restrict TensorFlow to only use the first GPU
        tf.config.experimental.set_visible_devices(gpus[0], 'GPU')
        tf.config.experimental.set_memory_growth(gpus[0], True)
    except RuntimeError as e:
        print(e)

##################
###HYPERPARAMS###
##################
model_config = {
    "model_type": "Tap2Drum",
    "model_info": "New rhtyhm2groove implementation DRAFT",
    "num_timesteps": 32,
    "num_instruments": 9,
    "num_metadata": 3,
    "N_SPLITS": 6,
    "TEST_SIZE": 0.1,
    "VAL_SIZE": 0.2,
    "LATENT_DIM": 256,
    "ENC_UNITS": 512,
    "DEC_UNITS": 256,
    "DENSE_DIM": 128,
    "BATCH_SIZE": 16,
    "NUM_EPOCHS": 60,
    "enc_D_OUT": 0.1, 
    "dec_D_OUT": 0.1, 
    "L2_REG": 0.001,  # adding regularization to all layers may increase the risk of underfitting --> start with a small value and increase if overfitting persists
    "TEMPERATURE": 0.5,
    "kl_weight": 0.5,
    "scheduler": False,
    "annealing": 'sigmoid',
    "initial_learning_rate": 0.0005,  # 0.002  also try 3e-4
    "min_learning_rate": 0.00002,
    "decay_rate": 0.9999,
    "decay_steps": 1000,
    "clip_norm": 1,  # normally clip_value=1.0
    "norm_loss": False,
    "extended_dataset": False,
    "reverse_input": False,
}


###UTILS###
###########

def temperature_sampling(args, temperature=model_config['TEMPERATURE']):
    '''sampling w temperature param (autoregressive)'''
    z_mean, z_log_var = args
    batch = tf.shape(z_mean)[0]
    dim = tf.shape(z_mean)[1]
    epsilon = tf.keras.backend.random_normal(shape=(batch, dim))

    # Apply the temperature to the random normal tensor
    epsilon *= temperature
    return z_mean + tf.exp(0.5 * z_log_var) * epsilon


def make_meta(numerator=4, denominator=4, bpm=120, min_tempo=240000, max_tempo=1250000, squeeze=True):
    '''func to create metadata to condition the latent space'''
    max_numerator = 4
    max_denominator = 4
    tempo = bpm2tempo(bpm)
    metadata = np.array([[(numerator - 1) / (max_numerator - 1), (denominator - 1) / (max_denominator - 1), (tempo - min_tempo) / (max_tempo - min_tempo)]], dtype=float)
    if squeeze:
        metadata = np.squeeze(metadata, axis=0)
    return metadata



def dynamic_tolerance(h_val, o_val, base_tolerance, offset_weight=0.7):
    """Calculate a dynamic tolerance based on the offset value.
     If offset_weight is high, then the influence of the offset 
     on the dynamic tolerance would be more pronounced."""
    return base_tolerance + (offset_weight * abs(o_val))


def apply_even_adjustments(track, discrepancy):
    adjustment_per_event = discrepancy / len([msg for msg in track if msg.type in ['note_on', 'note_off']])
    accumulated_adjustment = 0

    for msg in track:
        if msg.type in ['note_on', 'note_off']:
            adjustment = round(adjustment_per_event + accumulated_adjustment)
            accumulated_adjustment -= adjustment  # Subtract applied adjustment from the accumulated amount

            # Apply the adjustment ensuring delta_time remains non-negative
            msg.time = max(0, msg.time + adjustment)
            accumulated_adjustment += adjustment_per_event  # Accumulate the remaining adjustment for the next event




def arr2midi(h_matrix, o_matrix, v_matrix, m_matrix, bpm,
             meta=True, save=False, output_file='output.mid', tolerance=0.3,
             ticks_per_beat=480, quantize_to=4, quantize_length=1, denorm=True,
             min_tempo=240000, max_tempo=1250000, max_numerator=4, max_denominator=4,
             verbose=True, const_vel=False, round_delta=True):
    
    drum_categories = {
        'Bass Drum 1': [36, 35],
        'Acoustic Snare': [38, 37, 39, 40],
        'Low Floor Tom': [41, 43, 45, 78],
        'Low-Mid Tom': [47, 62, 63, 66, 77],
        'High Tom': [48, 50, 60, 65, 73, 74, 75, 76],
        'Open Hi-Hat': [46],
        'Closed Hi-Hat': [42, 44],
        'Ride Cymbal 1': [51, 53, 56, 59, 67, 68, 69, 70, 71, 72, 80, 81],
        'Crash Cymbal 1': [49, 52, 55, 57]
    }

    drum_map = [value[0] for value in drum_categories.values()]
    mid = MidiFile(ticks_per_beat=ticks_per_beat)
    ticks_per_quantize = ticks_per_beat // quantize_to
    track = MidiTrack()
    mid.tracks.append(track)

    # We do not denormalize offsets as we did not normalize in the beginning but only clipped them
    # Denormalize velocities
    if denorm:
        scaler = MinMaxScaler(feature_range=(0, 127))
        v_matrix = scaler.fit_transform(v_matrix).round(decimals=0)

    # Denormalize metadata
    # Initialize default metadata values
    numerator, denominator, tempo = 4, 4, bpm2tempo(bpm)

    # Use input metadata if 'meta' is True
    if meta:
        # Denormalize numerator and denominator if necessary
        numerator = int(m_matrix[0] * (max_numerator - 1) + 1) if denorm else m_matrix[0]
        denominator = int(m_matrix[1] * (max_denominator - 1) + 1) if denorm else m_matrix[1]
        
        # Denormalize tempo if necessary
        tempo = int(m_matrix[2] * (max_tempo - min_tempo) + min_tempo) if denorm else m_matrix[2]
    else:
        # If not using metadata, tempo is directly set from the provided BPM
        tempo = bpm2tempo(bpm)

    # Append metadata to the track
    track.append(MetaMessage('time_signature', numerator=numerator, denominator=denominator, time=0))
    track.append(MetaMessage('set_tempo', tempo=tempo, time=0))


    # Calculate expected loop length in ticks
    bars_per_loop = 2  # Assuming you want a 1 bar loop. Adjust accordingly.
    expected_ticks_per_loop = bars_per_loop * numerator * ticks_per_beat

    # cumulative_expected_time = 0
    cumulative_expected_time = -ticks_per_beat // quantize_to  # Set to a negative value equal to one quantization step to eliminate the initial 16th note offset.
    previous_time = 0
    prev_msg_index = None
    total_ticks = 0

    # Initialize variables for accumulated delta time correction
    accumulated_delta_correction = 0
    previous_note_off_time = 0

    for time_step, row in enumerate(h_matrix):
        cumulative_expected_time += ticks_per_quantize
        for part, h_val in enumerate(row):
            # Dynamic thresholding
            dyn_tolerance = dynamic_tolerance(h_val, o_matrix[time_step][part], tolerance)
            
            # If hit probability is above dynamic tolerance
            if h_val >= dyn_tolerance:
                h_matrix[time_step][part] = 1
                # Adjust the offset based on how close the h_val is to the dynamic tolerance
                o_matrix[time_step][part] *= (h_val - dyn_tolerance) / (1 - dyn_tolerance)
            else:
                h_matrix[time_step][part] = 0

            if h_matrix[time_step][part] == 1:  # If there's a hit
                offset_ticks = int(o_matrix[time_step][part] * ticks_per_beat)
                cumulative_expected_time += offset_ticks
                offset_ticks = max(0, offset_ticks)  # Clamp negative offsets to zero

                if const_vel:
                    velocity = 100
                else:
                    velocity = int(v_matrix[time_step][part])
                note = drum_map[part]

                # Calculate the delta_time for a hit, considering accumulated corrections
                delta_time = cumulative_expected_time - previous_time + accumulated_delta_correction

                if delta_time < 0:
                    # Accumulate the negative delta for correction in future steps
                    accumulated_delta_correction += delta_time
                    delta_time = 0  # Clamp negative delta time to zero for the current message

                # Append note_on message with adjusted delta time
                track.append(Message('note_on', note=note, velocity=velocity, time=delta_time))
                prev_msg_index = len(track) - 1
                total_ticks += delta_time
                previous_time += delta_time

                # Calculate and append note_off message
                off_time = quantize_length if time_step == len(h_matrix) - 1 else min(quantize_length, h_matrix[time_step + 1][part] * ticks_per_quantize)
                track.append(Message('note_off', note=note, velocity=0, time=off_time))
                previous_note_off_time = off_time

    # After processing all note events, potentially adjust the last note
    total_message_ticks = sum(msg.time for msg in track if not isinstance(msg, MetaMessage))
    if total_message_ticks > expected_ticks_per_loop:
        if verbose:
            print("The last note exceeds the loop length and will be discarded for loop alignment.")
        
        # Identify and discard the last note_on event and its corresponding note_off event
        for i in range(len(track) - 1, -1, -1):
            if track[i].type == 'note_on':
                del track[i:]  # Discard the last note_on and any subsequent events
                break


    # After processing all note events, apply even adjustments if there's a discrepancy
    total_message_ticks = sum(msg.time for msg in track if msg.type in ['note_on', 'note_off'])
    discrepancy = expected_ticks_per_loop - total_message_ticks

    if discrepancy != 0:
        apply_even_adjustments(track, discrepancy)

    # Recalculate total_message_ticks after adjustments
    total_message_ticks = sum(msg.time for msg in track if msg.type in ['note_on', 'note_off'])
    remaining_ticks = expected_ticks_per_loop - total_message_ticks

    # Your existing final loop duration adjustment code
    if remaining_ticks > 0:
        track.append(Message('note_off', note=drum_map[-1], velocity=0, time=remaining_ticks))

    if save:
        mid.save(output_file)

    return mid




def toggle_values(arr, num_indices=1):
    """
    Toggle values in the input array at random indices.

    Parameters:
    - arr (array-like): The input array containing only 0s and 1s.
    - num_indices (int): The number of random indices to toggle (default is 1).

    Returns:
    - Edited array with toggled values.
    """
    # Check if the input array is valid (contains only 0s and 1s)
    if not all(val in (0, 1) for val in arr):
        raise ValueError("Input array must consist of only 0s and 1s.")

    # Create a copy of the input array to avoid modifying the original
    edited_arr = arr.copy()

    # Generate random indices to toggle
    toggle_indices = random.sample(range(len(arr)), min(num_indices, len(arr)))

    # Toggle the values at the selected indices
    for index in toggle_indices:
        edited_arr[index] = 1 - edited_arr[index]

    return edited_arr


def model_imports(models_dir, verbose=False):

    # TODO: Avoid importing re module

    pattern1 = re.compile('.DS_Store')
    model_folders = [f for f in os.listdir(models_dir) if not pattern1.match(f)]
    model_folders.sort()
    if verbose:
        print(*model_folders, sep='\n')

    idx = 0 #3
    fold = 4 #this number has to be written in the file name

    M_FOLDER = model_folders[idx]
    print(f"\nSelected model folder: {M_FOLDER}")
    model_name = '_'.join(M_FOLDER.split('_')[:4])

    #load model config
    with open(glob.glob(os.path.join(models_dir, M_FOLDER + '/*.json'))[0]) as file:
        config_file = json.load(file)

    #load trained model
    custom_objects = {"temperature_sampling": temperature_sampling}
    model_path = os.path.join(models_dir, M_FOLDER, model_name + f'_fold_{fold}.h5')
    trained_model = load_model(model_path, custom_objects=custom_objects, compile=False)
    print(f"{model_name}_fold_{fold}.h5 is imported\n")

    return trained_model, config_file


####################
#### GENERATION ####
#####E##############

def set_seed(seed_value):
    tf.random.set_seed(seed_value)
    np.random.seed(seed_value)
    random.seed(seed_value)

def inject_noise(latent_vector, noise_std):
    noise = tf.random.normal(shape=tf.shape(latent_vector), mean=0., stddev=noise_std)
    return latent_vector + noise

def explore_neighborhood(latent_vector, delta):
    direction = tf.math.l2_normalize(tf.random.normal(shape=tf.shape(latent_vector), mean=0., stddev=1.), axis=1)
    return latent_vector + direction * delta

class LatentHistory:
    def __init__(self, max_size=2):
        self.latents = []
        self.max_size = max_size

    def add(self, latent_vector):
        if len(self.latents) >= self.max_size:
            self.latents.pop(0)
        self.latents.append(latent_vector)

    def get_last(self, n=1):
        return self.latents[-n:]

def interpolate_latents(z1, z2, alpha=0.5):
    return z1 * (1 - alpha) + z2 * alpha

def get_interpolated_latent(new_latent, history, alpha=0.5):
    # TODO: Check if this is working properly!
    last_latents = history.get_last(2)

    print(f"Last latents: {len(last_latents)}")
    
    if len(last_latents) == 2:  # if we have at least 2 latents in history
        interpolated = interpolate_latents(last_latents[0], last_latents[1], alpha)
        print(f"Current and previous latent points are interpolated")
    else:
        interpolated = new_latent  # if we don't have enough history yet
        print(f"Only current latent point is used as is – not enough history yet")

    history.add(new_latent)  # store the new latent vector
    return interpolated




def generate_groove(tapped_rhythm, bpm, temp, map_explore, noise, interpolate, latent_history=None, alpha=0.5):
    '''Func to generate a full drum groove from a tapped rhythm'''

    trained_model, _ = model_imports(models_dir='./models')
    encoder = trained_model.get_layer('encoder')
    decoder = trained_model.get_layer('decoder')

    taps_exp = np.expand_dims(tapped_rhythm, axis=0)
    metadata = make_meta(bpm=bpm)
    meta_exp = np.expand_dims(metadata, axis=0)

    rand_seed = random.randrange(42)
    set_seed(rand_seed) #42
    print(f"Random seed set to {rand_seed}")

    _, z_mean, z_log_var = encoder.predict([taps_exp, meta_exp])
    z = Lambda(lambda args: temperature_sampling(args, temperature=temp))([z_mean, z_log_var])
    
    if interpolate and latent_history: # Check if interpolation is requested and if we have a history to interpolate with
        z = get_interpolated_latent(z, latent_history, alpha)
        print("Interpolation performed")
    if noise:
        z = inject_noise(z, noise_std=0.2) # TODO: experiment w values for noise injection
        print("Noise injected")
    if map_explore:
        z = explore_neighborhood(z, delta=0.75) # TODO: experiment w values for mapping exploration
        print("Mapping exploration")

    h,v,o = [np.squeeze(arr, axis=0) for arr in decoder.predict([taps_exp, z])]
    return h,v,o, metadata



def temperature_softmax(logits, temperature=1.0):
    """
    Compute the softmax of the input logits scaled by temperature.
    :param logits: Input logits.
    :param temperature: Softmax temperature.
    :return: Softmax of the scaled input.
    """
    scaled_logits = logits / temperature
    return tf.nn.softmax(scaled_logits)


def generate_groove_softmax(tapped_rhythm, bpm, temp, map_explore, noise, interpolate, latent_history=None, alpha=0.5):
    '''Func to generate a full drum groove from a tapped rhythm
    TODO: Combine it with generate_groove()'''

    trained_model, _ = model_imports(models_dir='./models')
    encoder = trained_model.get_layer('encoder')
    decoder = trained_model.get_layer('decoder')

    taps_exp = np.expand_dims(tapped_rhythm, axis=0)
    metadata = make_meta(bpm=bpm)
    meta_exp = np.expand_dims(metadata, axis=0)

    rand_seed = random.randrange(42)
    set_seed(rand_seed)
    print(f"Random seed set to {rand_seed}")

    _, z_mean, z_log_var = encoder.predict([taps_exp, meta_exp])
    z = Lambda(lambda args: temperature_sampling(args, temperature=temp))([z_mean, z_log_var])
    
    if interpolate and latent_history:
        z = get_interpolated_latent(z, latent_history, alpha)
        print("Interpolation performed")
    if noise:
        z = inject_noise(z, noise_std=0.2)
        print("Noise injected")
    if map_explore:
        z = explore_neighborhood(z, delta=0.75)
        print("Mapping exploration")

    predictions = decoder.predict([taps_exp, z, meta_exp])
    h_logits = predictions[0]
    
    # Convert h_logits to a TF tensor, then apply temperature softmax
    h_logits_tf = tf.convert_to_tensor(h_logits)
    h = temperature_softmax(h_logits_tf, temp).numpy()
    h = np.squeeze(h, axis=0)

    v = np.squeeze(predictions[1], axis=0)
    o = np.squeeze(predictions[2], axis=0)

    return h, v, o, metadata



###################
#### To Client ####
####E##############

def is_valid_midi(midi_obj):
    has_events = False  # Flag to check if there's at least one note event
    for track in midi_obj.tracks:
        cumulative_time = 0
        for msg in track:
            cumulative_time += msg.time
            if cumulative_time < 0:
                return False
            if msg.type in ['note_on', 'note_off'] and msg.velocity > 0:  # Checks for 'note_on' events with a velocity greater than 0
                has_events = True
    
    # Return False if there are no note events at all
    if not has_events:
        return False

    return True


def response_formatter(success=True, message=None, data=None):
    return {
        "success": success,
        "message": message,
        "data": data
    }



latent_history = LatentHistory() # initializing a new instance of LatentHistory class for interpolation

# Initialization of global events and queues
db_app = Flask(__name__)# Connect to the browser interface
CORS(db_app)

@db_app.route('/send_array', methods=['POST']) #TODO: Do we need to specify the methods? If yes, GET and OPTIONS?
def receive_tapped_rhythms():

    data = request.json
    current_rhythm = data.get('array', [])
    current_bpm = data.get('bpm', 120)
    current_temp = data.get('temp', 1.0)
    current_thresh = data.get('thresh', 0.35)
    current_sampling = data.get('samplingStrategy', 'epsilon') # epsilon, softmax temp, or greedy?
    print(f"\nTempo: {current_bpm} BPM")
    print(f"Tapped rhythm: {current_rhythm}")
    print(f"Sampling temperature: {current_temp}")
    print(f"Threshold: {current_thresh}")

    # if current_sampling == 'epsilon':
    #     print("Sampling mode: epsilon")
    #     h, v, o, m = generate_groove(current_rhythm, current_bpm, current_temp, 
    #                                  map_explore=False, noise=False, interpolate=False)
    # elif current_sampling == 'softmax_temp':
    #     print("Sampling mode: softmax temperature")
    #     h, v, o, m = generate_groove_softmax(current_rhythm, current_bpm, current_temp, 
    #                                  map_explore=False, noise=False, interpolate=False)

    #just change to generate_groove for NON softmax
    h, v, o, m = generate_groove_softmax(current_rhythm, current_bpm, current_temp, 
                                 map_explore=False, noise=False, interpolate=True) #, latent_history=latent_history
    

    midi_obj = arr2midi(h_matrix=h, o_matrix=o, v_matrix=v, m_matrix=m, bpm=current_bpm,
                         save=False, tolerance=current_thresh, verbose = True)
    

    if not is_valid_midi(midi_obj):
        print("Invalid MIDI object generated. Skipping save.")
        return jsonify(response_formatter(success=False, message="Invalid MIDI generated")), 400

    else:
        buffer = io.BytesIO()
        midi_obj.save(file=buffer) #TODO: Find a better way of transmitting the MIDI files!!!!!!!!!!!!!!
        midi_bytes = buffer.getvalue()
        midi_bytes_length = len(midi_bytes)
        print(f"Generated MIDI bytes length: {midi_bytes_length}")

        encoded_midi = base64.b64encode(midi_bytes) 
        response_data = {"success": True, "data": encoded_midi.decode('utf-8')}
        
        print(f"Generated MIDI sent to client")
        return jsonify(response_data)
        # return Response(midi_bytes, content_type='audio/midi')




@db_app.after_request
def add_header(response):
    response.cache_control.no_store = True
    return response


if __name__ == "__main__":
    db_app.run(debug=False, port=5002) # NOTE: Change debug to False when deploying for security.