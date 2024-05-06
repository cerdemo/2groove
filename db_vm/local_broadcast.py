# drumbot "dB"
# Çağrı Erdem, 2023
# SINLAB/IFI/UiO
"""
This "rhythm2groove" model architecture is essentially an LSTM-VAE-based seq2seq machine translation.
We translate fixed tapping rhythms (binary note on/offs) into combined full drum grooves:
Hits, Velocity, and Time Offsets matrices.
We use treacher forcing in the training model.
The inference model is based on decoding autoregressively.
"""
#yaptim oldu mk
import argparse
import glob
import json
import os
import queue
import random
import re
import signal
import threading
import time

import clockblocks
import numpy as np
import rtmidi
import tensorflow as tf
from flask import Flask, jsonify, request
from flask_cors import CORS
from keras.layers import Lambda
from keras.models import load_model
from mido import Message, MetaMessage, MidiFile, MidiTrack, bpm2tempo
from sklearn.preprocessing import MinMaxScaler

# argument parser
parser = argparse.ArgumentParser(description='dB (drumBot) tap2drum MIDI Broadcasting')
parser.add_argument('-t', '--temp', type=float, default=0.01, help='Sampling temperature (less --> control)')
parser.add_argument('-s', '--n_samples', type=int, default=30, help='Amound of data points to be sampled from the latent space')
parser.add_argument('-m', '--method', type=str, default='k-means', help='Choose the method to generate sample points from the latent space: k-means, hierarchical, or random')
parser.add_argument('-nc', '--n_clusters', type=int, default=4, help='N_clusters of obersvations')
parser.add_argument('--init_cluster', type=int, default=0, help="Define the initial cluster to start the gen with.")
parser.add_argument('-p', '--port', type=int, default=6666, help="OSC server (receiver) port number.")
parser.add_argument('-b', '--bpm', type=int, default=77, help="Decide on the BPM (beat-per-minute) to condition the model generation")
parser.add_argument('-pe', '--print_events', action='store_true', help="Print MIDI events that are being played or not")
parser.add_argument('--add_offset', type=float, default=0.005, help="Add some time offset to sync/calibrate the loop (default= 5ms)")
parser.add_argument('--model', type=int, default=0, help="Which model to import from the directory.")

# Parse the command-line arguments into a dictionary
args = parser.parse_args()
print(f"Command-line arguments: {args}")

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


def arr2midi(h_matrix, o_matrix, v_matrix, m_matrix, bpm,
             meta=True, save=False, output_file='output.mid', tolerance=0.3, # tolerance=0.3 more conservative, 0.15 more aggressive
             ticks_per_beat=480, quantize_to=4, quantize_length=1, denorm=True,
             min_tempo=240000, max_tempo=1250000, max_numerator=4, max_denominator=4,
             verbose=True, const_vel=False, round_delta=True):
    
    '''
    Func that receives the Hits, Velocities, Time Offsets, and Metadata matrices and create MIDI object.

    Notes to revised version (20230910):
    - Calculating the expected ticks for the loop based on the time signature.
    - Ensuring the total ticks in the MIDI match this expectation.
    - An accumulation of total ticks (total_ticks) added.
    - At the end, if there are remaining ticks to reach our metric boundary, 
    an additional note_off event (with no sound) added to fill in the remaining time, thus ensuring our MIDI loop is perfectly aligned.
    
    Notes to revised version (20230911):
    - The delta_time calculation based on the difference between adjusted_time and previous_time can lead to the drift 
      when looping because the accumulated offsets might push events too far ahead or behind. 
    - Instead, incorporate an approach based on cumulative_expected_time which is anchored to the quantized grid.

    Notes to revision (20231018)
    - A second pass of negative-delta-check added for extra layer of safety.
    - We ensure that, for example, if a snare hit was intended to be slightly before the beat (hence, a negative delta), 
    adjusting the delta time of the preceding note (like a hi-hat hit) 
    instead of just resetting the snare's delta time ensures that the snare still hits slightly ahead of the beat. 
    This adjustment respects the groove's intention and maintains its feel.
    '''

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

    # # TODO: this is only temporary!
    # if const_vel:
    #     drum_categories['Bass Drum 1'][0] = 39
    # else:
    #     drum_categories['Bass Drum 1'][0] = 36

    drum_map = [value[0] for value in drum_categories.values()]
    mid = MidiFile(ticks_per_beat=ticks_per_beat)
    ticks_per_quantize = ticks_per_beat // quantize_to
    track = MidiTrack()
    mid.tracks.append(track)

    # tolerance for converting hit probabilities into binary values
    h_matrix_binary = np.where(h_matrix >= tolerance, 1, 0)

    # We do not denormalize offsets as we did not normalize in the beginning but only clipped them
    # Denormalize velocities
    if denorm:
        scaler = MinMaxScaler(feature_range=(0, 127))
        v_matrix = scaler.fit_transform(v_matrix).round(decimals=0)

    # Denormalize metadata
        if meta:  # use input metadata
            metadata = {
                'numerator': int(m_matrix[0] * (max_numerator - 1) + 1),
                'denominator': int(m_matrix[1] * (max_denominator - 1) + 1),
                'tempo': int(m_matrix[2] * (max_tempo - min_tempo) + min_tempo)
            }
        else:
            # TODO: doesn't seem like efficient solution (bpm->norm->denorm again...)  But it's necessary to condition with external BPM
            bpm_norm = (bpm2tempo(bpm) - min_tempo) / (max_tempo - min_tempo)
            metadata = {
                'numerator': 1,
                'denominator': 1,
                'tempo': int(bpm_norm * (max_tempo - min_tempo) + min_tempo)
            }
    else:
        if meta:
            metadata = {
                'numerator': m_matrix[0],
                'denominator': m_matrix[1],
                'tempo': m_matrix[2]
            }
        else:
            metadata = {
                'numerator': 4,
                'denominator': 4,
                'tempo': bpm2tempo(bpm)  # 500000
            }

    track.append(MetaMessage('time_signature',
                 numerator=metadata['numerator'], denominator=metadata['denominator'], time=0))
    track.append(MetaMessage('set_tempo', tempo=metadata['tempo'], time=0))


    # Calculate expected loop length in ticks
    bars_per_loop = 2  # Assuming you want a 1 bar loop. Adjust accordingly.
    expected_ticks_per_loop = bars_per_loop * metadata['numerator'] * mid.ticks_per_beat

    cumulative_expected_time = 0
    previous_time = 0
    prev_msg_index = None
    total_ticks = 0

    for time_step, row in enumerate(h_matrix_binary):
        # At the beginning of each iteration for time_step, before checking the parts and values:
        cumulative_expected_time += ticks_per_quantize
        for part, value in enumerate(row):
            if value == 1:  # Only if there's a hit:
                offset_ticks = int(o_matrix[time_step][part] * ticks_per_beat)
                if const_vel:
                    velocity = 100
                else:
                    velocity = int(v_matrix[time_step][part])
                note = drum_map[part]
                
                # Calculate the delta_time for a hit:
                delta_time = cumulative_expected_time - previous_time + offset_ticks
                
                if round_delta:
                    delta_time = round(delta_time)  # round to the nearest integer #TODO: Check?
                
                if verbose:
                    print(f" Time step: {time_step}, Note: {note}, Velocity: {velocity}, Offset: {offset_ticks}, Delta time: {delta_time}")
                    if delta_time < 0:
                        print(f"\n---> Negative Delta Time at Time step: {time_step} <---\n")

                if delta_time < 0 and prev_msg_index is not None:
                    # Update the previous note_on message
                    track[prev_msg_index].time += delta_time
                    # delta_time = 0 #NOTE: keep this only if you want an additional layer of safety against adding negative delta times
                else:
                    # Append a new note_on message
                    track.append(Message('note_on', note=note, velocity=velocity, time=delta_time))
                    prev_msg_index = len(track) - 1

                total_ticks += delta_time  # accumulate the total ticks
                previous_time += delta_time  # update the previous_time by adding the delta_time to it

                # Append a note_off message
                track.append(Message('note_off', note=note, velocity=0, time=quantize_length))
    
    # Correct any negative deltas --This second pass ensures that any negative deltas are adjusted in a way that respects the "feeling" of the groove.
    # adjusting the delta time of the preceding note (like a hi-hat hit) instead of just resetting the snare's delta time ensures that the snare still hits slightly ahead of the beat. 
    for idx, message in enumerate(track[1:], 1):  # Start from the second message (index 1)
        if message.time < 0:
            # If there's a preceding message, adjust its time. Otherwise, set current message time to 0.
            if idx > 0:
                track[idx - 1].time += message.time
                message.time = 0
            else:
                message.time = 0

    # Ensure the loop aligns with the intended metric boundary
    remaining_ticks = expected_ticks_per_loop - total_ticks
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


def model_imports(models_dir, test_data=True, verbose=False):
    pattern1 = re.compile('.DS_Store')
    model_folders = [f for f in os.listdir(models_dir) if not pattern1.match(f)]
    model_folders.sort()
    if verbose:
        print(*model_folders, sep='\n')
    
    print("\nSelect a model to import (press Enter if unknown):")
    user_model = input("Enter the model index to import: ")
    user_fold = input("Enter the fold index to import: ")
    idx = int(user_model) if user_model else -1
    fold = int(user_fold) if user_fold else 4

    M_FOLDER = model_folders[idx]
    print(f"\nSelected model folder: {M_FOLDER}")
    model_name = '_'.join(M_FOLDER.split('_')[:4])

    test_indices = []
    if test_data:
        #load test indices
        test_indices_dir = os.path.join(models_dir, M_FOLDER, model_name + '_test_split')
        test_data = sorted(glob.glob(test_indices_dir + '/*.npy'))
        for path in test_data:
            test_indices.append(np.load(path, allow_pickle=True))
        print(f"{len(test_indices)} test data imported")

    #load model config
    with open(glob.glob(os.path.join(models_dir, M_FOLDER + '/*.json'))[0]) as file:
        config_file = json.load(file)

    #load trained model
    model_path = os.path.join(models_dir, M_FOLDER, model_name + f'_fold_{fold}.h5')
    trained_model = load_model(model_path, compile=False)
    print(f"{model_name}_fold_{fold}.h5 is imported\n")

    if test_data:
        return trained_model, config_file, test_indices
    return trained_model, config_file


###################
## IMPORT MODELS ##
###################


# NOTE: You don't need to import test indices if you're not using them.
t2d_dir = '/Users/cagrierdem/Desktop/ongoing/POSTDOC/dB_workspace/drumbot/main/models/Tap2Drum'
try:
    # trained_model, model_config, test_indices = model_imports(t2d_dir, idx=-1, fold=4, test_data=True, verbose=True)
    trained_model, model_config = model_imports(t2d_dir, test_data=False, verbose=True)
    trained_model.summary()
except Exception as e:
    print(f'Error occurred during import: {e}')

# Load the encoder and decoder separately. # NOTE that this would work only the models trained from 20230729
encoder = trained_model.get_layer('encoder')
decoder = trained_model.get_layer('decoder')
print(f"\nEncoder and Decoder imported successfully.")

# print(f'\nI have {len(test_indices)} test indices, which come in tuples as {len(test_indices[0][0])} input matrices & {len(test_indices[0][1])} output matrices')
# print(f"Input matrices consist of {test_indices[0][0].keys()}")
# print(
#     f"Each key returns a batch of matrices, such as {len(test_indices[0][0]['input_tap_hits'])}\n")



###################
#### GEN UTILS ####
###################

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


class MasterClock:
    def __init__(self):
        self.start_time = time.time()

    def time(self):
        """Return the elapsed time since the clock started."""
        return time.time() - self.start_time

    def reset(self):
        """Reset the clock to start counting from the current time."""
        self.start_time = time.time()

    def wait(self, duration):
        """Sleep for the specified duration."""
        time.sleep(duration)



####################
## MIDI BROADCAST ##
####################

# Global control events
generation_queue = queue.Queue(maxsize=4)
new_rhythm_event = threading.Event()
pause_event = threading.Event()
stop_event = threading.Event()
change_groove_event = threading.Event() # TODO: Event to change groove for the same tapped rhythm
current_bpm = 90
current_temp = 0.3
latent_history = LatentHistory() # initializing a new instance of LatentHistory class for interpolation

# Constants
MS_PER_SEC = 1_000_000  # microseconds per second
BARS = 2
BEATS_PER_BAR = 4  # 4/4 time signature
BEAT_DURATION = 60 / current_bpm  # in seconds


def generate_groove(encoder, decoder, tapped_rhythm, bpm, temp, map_explore, noise, interpolate, latent_history=None, alpha=0.5):
    '''Func to generate a full drum groove from a tapped rhythm'''

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
        z = inject_noise(z, noise_std=7.2) # TODO: experiment w values for noise injection
        print("Noise injected")
    if map_explore:
        z = explore_neighborhood(z, delta=8.75) # TODO: experiment w values for mapping exploration
        print("Mapping exploration")

    h,v,o = [np.squeeze(arr, axis=0) for arr in decoder.predict([taps_exp, z])]
    return h,v,o, metadata


def midi2events(midi_obj):
    '''(docstring)'''
    events = []
    tempo = None
    ticks_per_beat = midi_obj.ticks_per_beat
    for track in midi_obj.tracks:
        for msg in track:
            if msg.type == 'note_on' or msg.type == 'note_off':
                events.append((msg.time, msg.type, msg.note, msg.velocity))
            elif msg.type == 'set_tempo':
                tempo = msg.tempo
    return events, tempo, ticks_per_beat


def generate_midi_message(event_type, pitch, velocity):
    event_map = {'note_on': 0x90, 'note_off': 0x80}
    return [event_map.get(event_type, event_type), pitch, velocity]


def introduce_delays(events, ticks_per_beat, current_loop_count, quantize_delay_to=8, delay_increase_factor=0.1):
    # TODO: Could be a fine idea but doesn't work at the moment.

    print("Function introduce_delays has been called.")
    # This determines how much the probability of delay increases with each loop iteration.
    # delay_increase_factor = 0.1 means a 10% increase in probability with each loop

    # Probabilities for delaying the 1st, 2nd, 3rd, and 4th beats respectively
    beat_probabilities = [0.1, 0.3, 0.2, 0.4]
    
    # Adjust probabilities based on the current loop count
    adjusted_probabilities = [min(p + p * delay_increase_factor * current_loop_count, 1) for p in beat_probabilities]
    
    accumulated_time = 0  # To track the absolute position in the MIDI sequence
    delay_ticks = ticks_per_beat//quantize_delay_to  # 1/8th note delay

    for i, event in enumerate(events):
        delta_time, event_type, pitch, velocity = event
        accumulated_time += delta_time
        
        print(f"Accumulated Time: {accumulated_time}, Twice Ticks per Beat: {ticks_per_beat * 2}")
        # Check if it's a downbeat
        tolerance = 3  # Just an arbitrary value, you can adjust
        if abs(accumulated_time % (ticks_per_beat * 2)) <= tolerance:
        # if accumulated_time % (ticks_per_beat * 2) == 0:  # Assuming 480 ticks per beat and 4/4 time
            beat_num = (accumulated_time // (ticks_per_beat * 2)) % 4  # This will give values: 0, 1, 2, or 3
            print(f"Checking beat {beat_num + 1} at accumulated time {accumulated_time}. Current delay probability: {adjusted_probabilities[beat_num]:.2f}")
                
            # Introduce a delay based on probability
            if random.random() < adjusted_probabilities[beat_num]:
                print(f"Delaying beat {beat_num + 1} by {delay_ticks} ticks!")
                events[i] = (delta_time + delay_ticks, event_type, pitch, velocity)
                
                # Adjust the subsequent event's delta time to account for the delay (typically the note_off for the same note)
                next_event = events[i+1]
                next_delta, next_event_type, next_pitch, next_velocity = next_event
                events[i+1] = (next_delta - delay_ticks, next_event_type, next_pitch, next_velocity)
            else:
                print(f"Beat {beat_num + 1} remains undelayed.")
    
    return events


#TODO: Test the Scamp library for MIDI broadcasting
def broadcasting_loop(generation_queue, stop_event, virtual_port=True, introduce_delay=False, verbose=False):
    '''This is so far the best broadcasting loop implementation in terms of synchronization & time.
    It uses the clockblocks clock to synchronize the groove loops.
    However, it discarded the idea of using the change_groove_event to switch to a new groove.
    TODO: 1- Implement the change_groove_event to switch to a new groove.
          2- Implment storing the last groove so that it can be repeated as model input or recalled (perhaps use UL element for this??)'''
    
    global desired_loops, current_bpm

    # MIDI initialization
    midiout = rtmidi.MidiOut()
    available_ports = midiout.get_ports()
    print(f"Available MIDI ports: {available_ports}")
    if virtual_port:
        midiout.open_virtual_port("dB virtual output")
        print("Using dB virtual MIDI output")
    else:
        midiport = input("Enter the MIDI port")
        midiout.open_port(midiport)
        print(f"Using {midiport} as the MIDI port")
    current_midi_events = []
    print("Starting broadcasting loop...")

    def compute_groove_duration(current_tempo, ticks_per_beat, total_ticks):
        '''Computes the total duration of the groove in seconds.'''
        tempo_in_seconds_per_beat = current_tempo / MS_PER_SEC
        total_duration = tempo_in_seconds_per_beat * (total_ticks / ticks_per_beat)
        return total_duration    
        
    current_tempo = int(60_000_000 / current_bpm)  # Convert BPM to microseconds per beat
    current_loop_count = 0
    new_groove_queued = False  # This flag is set to True when a new groove enters the queue
    
    midi_obj = generation_queue.get()
    current_midi_events, current_tempo, ticks_per_beat = midi2events(midi_obj)
    tempo_in_seconds_per_tick = current_tempo / MS_PER_SEC / ticks_per_beat

    # Initialize master clock
    master_clock = clockblocks.Clock(timing_policy=0, initial_tempo=current_bpm).run_as_server() # 0 is equivalent to absolute timing, 1 is equivalent to relative timing.
    reference_start_time = master_clock.time()

    try:
        current_loop_count = 0  # Initialize loop count
        while not stop_event.is_set():
            total_ticks = sum(event[0] for event in current_midi_events)

            # If there's a new groove queued up, don't process it immediately. 
            # Just mark that a new groove is waiting. #TODO: Check where this conditional should be at?
            if change_groove_event.is_set() and not generation_queue.empty():
                new_groove_queued = True
                change_groove_event.clear()  # Reset the event
                current_loop_count = 0  # Reset the loop count
                print(f"Detected a new groove queued – waiting for the current groove to loop {desired_loops} times")
            # First loop of the groove for the desired number of times, then switch to the new groove
            if new_groove_queued and current_loop_count >= desired_loops:
                midi_obj = generation_queue.get_nowait()
                current_midi_events, current_tempo, ticks_per_beat = midi2events(midi_obj)
                tempo_in_seconds_per_tick = current_tempo / MS_PER_SEC / ticks_per_beat
                print("Switched to the new groove")
                new_groove_queued = False  # Reset the flag
                current_loop_count = 0  # Reset the loop count
            
            master_clock.tempo = current_bpm  # Update the tempo
            if verbose:
                print(f"Master clock tempo: {master_clock.absolute_tempo()} BPM")
            groove_duration = compute_groove_duration(current_tempo, ticks_per_beat, total_ticks)
            # Compute the expected start time for this loop based on the reference
            expected_start_time = reference_start_time + (current_loop_count * groove_duration)

            # If we're ahead of the expected start time, wait
            while master_clock.time() < expected_start_time:
                master_clock.wait(0.01, units="time")  # Wait in small increments to be ready #TODO: Check the efficiency of this

            # Broadcast the current MIDI events.
            for event in current_midi_events:
                if stop_event.is_set():
                    break
                while pause_event.is_set():
                    master_clock.wait(0.1, units="time")

                timestamp, event_type, pitch, velocity = event
                message = generate_midi_message(event_type, pitch, velocity)
                midiout.send_message(message)

                master_clock.wait(timestamp * tempo_in_seconds_per_tick, units="time") # Locking the clock here
                # print(f"Master clock wait time: {timestamp * tempo_in_seconds_per_tick} seconds")

            current_loop_count += 1
            print(f"Current groove looped {current_loop_count} times")

    except KeyboardInterrupt:
        print("Exiting...")
    finally:
        del midiout



# Initialization of global events and queues
js2py_app = Flask(__name__)# Connect to the browser interface
CORS(js2py_app)

@js2py_app.route('/send_array', methods=['POST'])
def receive_tapped_rhythms():
    global current_rhythm, current_bpm, current_temp, current_loop_count, hitTolerance
    data = request.json
    current_rhythm = data.get('array', [])
    current_bpm = data.get('bpm', 120)
    current_temp = data.get('temp', 1.0)
    print(f"\nTempo: {current_bpm} BPM")
    print(f"Tapped rhythm: {current_rhythm}")
    print(f"Sampling temperature: {current_temp}")

    h, v, o, m = generate_groove(encoder, decoder, current_rhythm, current_bpm, current_temp, 
                                 map_explore=False, noise=False, interpolate=True, latent_history=latent_history)
    midi_obj = arr2midi(h_matrix=h, o_matrix=o, v_matrix=v, m_matrix=m, bpm=current_bpm,
                         save=False, tolerance=hitTolerance)
    generation_queue.put(midi_obj)
    change_groove_event.set()  # Trigger the broadcasting loop to switch to the new groove
    current_loop_count = 0  # Reset the loop count here
    new_rhythm_event.set()  # Trigger the generation loop to produce a new DG
    return jsonify({"message": "Processing tapped rhythms"})


@js2py_app.route('/set_params', methods=['POST'])
def set_loops():
    global desired_loops, hitTolerance

    desired_loops = request.json.get('loops', 2)  # Default to 2 loop if not provided
    hitTolerance = request.json.get('tolerance', 0.15)  
    seed_value = request.json.get('seed', 42)
    set_seed(seed_value)
    print(f"Loop {desired_loops} times")
    print(f"Tolerance for probabilities to drum hits: {hitTolerance}")
    return jsonify({"message": f"Set to loop {desired_loops} times"})


@js2py_app.route('/control', methods=['POST'])
def control():
    global current_rhythm, current_bpm, current_temp, current_loop_count, hitTolerance

    action = request.json.get('action', '')
    if action == 'pause':
        pause_event.set()
    elif action == 'resume':
        pause_event.clear()
    elif action == 'change':
        if current_rhythm:  # Make sure we've received a rhythm before
            data = request.json
            if not data:
                return jsonify({"message": "No data received", "status": "error"}), 400

            current_temp = data.get('newTemp', 0.3)
            current_bpm = data.get('newBpm', 120)
            print(f"\nChange! Tempo: {current_bpm} BPM; Temperature: {current_temp}")

            current_rhythm = toggle_values(current_rhythm, num_indices=1) #TODO: Check if this is useful
            print(f"Reused & toggled tapped rhythm: {current_rhythm}")

            h, v, o, m = generate_groove(encoder, decoder, current_rhythm, current_bpm, current_temp, 
                                         map_explore=True, noise=True, interpolate=False, latent_history=None)
            midi_obj = arr2midi(h_matrix=h, o_matrix=o, v_matrix=v, m_matrix=m, bpm=current_bpm, 
                                save=False, tolerance=hitTolerance)
            generation_queue.put(midi_obj)
            change_groove_event.set()  # Trigger the broadcasting loop to switch to the new groove
            current_loop_count = 0  # Reset the loop count here
            new_rhythm_event.set()  # Trigger the generation loop to produce a new DG
            return jsonify({"message": "Changed groove based on current tapped rhythm"})
        else:
            return jsonify({"message": "Rhythm not received yet", "status": "error"}), 400
        
    elif action == 'stop':
        os.kill(os.getpid(), signal.SIGINT)  # similar to cmd+C
        return jsonify({"message": f"Action {action} processed, server stopped"})

    return jsonify({"message": f"Action {action} processed"})


@js2py_app.after_request
def add_header(response):
    response.cache_control.no_store = True
    return response


# RUN THE THREADS
broadcasting_thread = threading.Thread(target=broadcasting_loop, args=(generation_queue, stop_event))
broadcasting_thread.daemon = True
broadcasting_thread.start()

if __name__ == "__main__":
    js2py_app.run(threaded=True, debug=True, port=5002)


# NOTE:
# The drift we are observing is because of the cumulative effect of small timing errors across the entire MIDI sequence. 
# The main challenge is to ensure that the accumulated delta_time across all the messages equals the total length of the sequence, ensuring no drift when looping. 
# This is easier said than done, due to quantization and offset adjustments.