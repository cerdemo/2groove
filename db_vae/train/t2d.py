 # drumbot "dB"
# Çağrı Erdem, 2023
# IFI/UiO
"""
The model architecture is essentially a conditional VAE, where we are conditioning on two things: metadata and the tapping rhythm. 
The idea is that the metadata provides high-level control over the style of the generated groove (e.g., genre, complexity), 
and the tapping rhythm gives a rough sketch of the desired rhythm pattern.
"""
#yaptim oldu mk
import argparse
import datetime
import gc
import io
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from keras.regularizers import l2
from sklearn.model_selection import KFold, TimeSeriesSplit, train_test_split
from tensorflow.compat.v1 import logging as tf_logging
from tensorflow.keras import backend as K
from tensorflow.keras.callbacks import (EarlyStopping, ModelCheckpoint,
                                        TensorBoard)
from tensorflow.keras.layers import (LSTM, BatchNormalization, Bidirectional,
                                     Concatenate, Dense, Dropout, Input,
                                     Lambda, RepeatVector, Reshape,
                                     TimeDistributed)
from tensorflow.keras.losses import Loss, binary_crossentropy
from tensorflow.keras.models import Model
from tensorflow.keras.utils import Sequence
# from tqdm import tqdm

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
tf_logger = tf.get_logger()
tf_logger.setLevel(logging.ERROR)
handler = logging.FileHandler('tensorflow.log')
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
tf_logger.addHandler(handler)

# Check GPU
G = len(tf.config.experimental.list_physical_devices('GPU'))
print("Num GPUs Available: ", G)
print("tf version ", tf.__version__)
print("Built with CUDA:", tf.test.is_built_with_cuda())
print("Built with GPU support:", tf.test.is_built_with_gpu_support())

# argument parser
parser = argparse.ArgumentParser(description='Description of your script')
parser.add_argument('-b', '--batch', type=int, default=16, help='Batch size')
parser.add_argument('-e', '--epoch', type=int,default=150, help='Number of epochs')
parser.add_argument('-f', '--fold', type=int, default=11,help='kfold Split number')
parser.add_argument('-d', '--dataset', type=str, default='drum',help="Choose whether to use 'drum' [32,9] or 'tap' data [32,1]")
parser.add_argument('-i', '--num_instrument', type=int, default=9,help="Choose either 9 for full drumset or 1 for taps (collapsed drums)")
parser.add_argument('-enc', '--encoder', type=int,default=512, help='Encoder LSTM units')
parser.add_argument('-dec', '--decoder', type=int,default=256, help='Decoder LSTM units')
parser.add_argument('--dense', type=int,default=256, help='Dense layer units for tap inputs')
parser.add_argument('--decoder_layers', type=int,default=3, help='Decoder LSTM-Dropout pair amount')
parser.add_argument('-l', '--latent_dim', type=int,default=256, help='Latent space dimension')
# if flag provided, args.norm_loss = True, else False 
parser.add_argument('-n', '--norm_loss', action='store_true',help="Normalize the loss or not")
parser.add_argument('-lr', '--learning_rate', type=float,default=3e-4, help="Learning rate")
parser.add_argument('-s', '--scheduler', action='store_true',help="Use learning rate scheduler or not")
parser.add_argument('--lab', action='store_false',help="Lab computer or not")
parser.add_argument('--extended', action='store_true',help="Extended dataset or not")
parser.add_argument('--model_info', type=str, default='No info added', help='Necessary details/information about the trained model')
parser.add_argument('--beta', type=float, default=0.5, help="KL weight tuning")
parser.add_argument('--kl_annealing', type=str, default='constant', help='Choose the annealing for the kl weight')
parser.add_argument('--rev', action='store_true',help="Reverse the Encoder input or not")
# ...


# Parse the command-line arguments into a dictionary
args = parser.parse_args()
# Access the arguments as key-value pairs in the args dictionary
print(f"Batch size: {args.batch}")
print(f"Num of epochs: {args.epoch}")
print(f"Num of kfolds: {args.fold}")
print(f"Encoder LSTM units: {args.encoder}")
print(f"Decoder LSTM units: {args.decoder}")
print(f"Latent space dimension: {args.latent_dim}")
print(f"Normalize loss: {args.norm_loss}")
print(f"Learning rate: {args.learning_rate}")
print(f"Use learning rate scheduler: {args.scheduler}")


##################
###HYPERPARAMS###
##################
model_config = {
    "model_type": "Tap2Drum",
    "model_info": "Tap2drum w/ selected tap-data",
    "num_timesteps": 32,
    "num_instruments": 9,
    "num_metadata": 3,
    "N_SPLITS": 11,
    "TEST_SIZE": 0.1,
    "VAL_SIZE": 0.2,
    "LATENT_DIM": 512,
    "ENC_UNITS": 1024,
    "DEC_UNITS": 512,
    "DENSE_DIM": 512,
    "BATCH_SIZE": 16,
    "NUM_EPOCHS": 150,
    "enc_D_OUT": 0.05, 
    "dec_D_OUT": 0.05, 
    "L2_REG": 0.0001,  # adding regularization to all layers may increase the risk of underfitting --> start with a small value and increase if overfitting persists
    "TEMPERATURE": 0.5,
    "kl_weight": 0.5,
    "scheduler": False,
    "annealing": 'constant',
    "initial_learning_rate": 2e-05,  # 0.002  also try 3e-4
    "min_learning_rate": 2e-05,
    "decay_rate": 0.9999,
    "decay_steps": 1000,
    "clip_norm": 1,  # normally clip_value=1.0
    "norm_loss": False,
    "extended_dataset": True,
    "reverse_input": False,
}

model_config['num_instruments'] = args.num_instrument
model_config['LATENT_DIM'] = args.latent_dim
model_config['ENC_UNITS'] = args.encoder
model_config['DEC_UNITS'] = args.decoder
model_config['DENSE_DIM'] = args.dense
model_config['BATCH_SIZE'] = args.batch
model_config['NUM_EPOCHS'] = args.epoch
model_config['N_SPLITS'] = args.fold
model_config['norm_loss'] = args.norm_loss
model_config['initial_learning_rate'] = args.learning_rate
model_config['scheduler'] = args.scheduler
model_config['extended_dataset'] = args.extended
model_config['kl_weight'] = args.beta
model_config['model_info'] = args.model_info
model_config['annealing'] = args.kl_annealing
model_config['reverse_input'] = args.rev


###########
###UTILS###
###########

# TODO: You must modify both drum_data and tap_data paths!
def which_comp(laptop=True, extended=False):
    '''choose betwen two dirs --> laptop or lab computer'''
    if extended:
        folder_name = 'npy_extended'
    else:
        folder_name = 'npy'
    if laptop:
        drum_data = f'/Users/cagrierdem/Desktop/ongoing/POSTDOC/dB_workspace/drumbot/dB_dat/{folder_name}_pulse'
        tap_data = f'/Users/cagrierdem/Desktop/ongoing/POSTDOC/dB_workspace/drumbot/dB_dat/{folder_name}_pulse_tap'
    else:
        drum_data = f'/home/cerdemo/Desktop/data/db/{folder_name}_pulse'
        tap_data = f'/home/cerdemo/Desktop/data/db/{folder_name}_pulse_tap'

    return drum_data, tap_data

def plot_losses(history, fold_idx):
    # Plot training and validation losses
    plt.figure(figsize=(10, 6))
    plt.plot(history.history['loss'], label='Training Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title(f'Training and Validation Loss (Fold {fold_idx + 1})')
    plt.grid(True)
    plt.legend()
    plt.savefig(model_dir + model_name + f'_fold_{fold_idx + 1}.png')
    plt.close() 

    # Subplots for H, V, O, KL losses
    fig, axs = plt.subplots(2, 2, figsize=(12, 12))
    
    # Plot H loss
    axs[0, 0].plot(history.history['output_hits_loss'], label='H Loss', color='green')
    axs[0, 0].set_title('H Loss')
    axs[0, 0].set_xlabel('Epoch')
    axs[0, 0].set_ylabel('Loss')
    axs[0, 0].legend()

    # Plot V loss
    axs[0, 1].plot(history.history['output_velocities_loss'], label='V Loss', color='red')
    axs[0, 1].set_title('V Loss')
    axs[0, 1].set_xlabel('Epoch')
    axs[0, 1].set_ylabel('Loss')
    axs[0, 1].legend()

    # Plot O loss
    axs[1, 0].plot(history.history['output_time_offsets_loss'], label='O Loss', color='blue')
    axs[1, 0].set_title('O Loss')
    axs[1, 0].set_xlabel('Epoch')
    axs[1, 0].set_ylabel('Loss')
    axs[1, 0].legend()

    # Plot KL loss
    axs[1, 1].plot(history.history['kl_loss'], label='KL Loss', color='purple')
    axs[1, 1].set_title('KL Loss')
    axs[1, 1].set_xlabel('Epoch')
    axs[1, 1].set_ylabel('Loss')
    axs[1, 1].legend()

    # Save the figure with subplots
    fig.suptitle(f'H, V, O, KL Losses (Fold {fold_idx + 1})')
    plt.savefig(model_dir + model_name + f'_losses_subplot_fold_{fold_idx + 1}.png')
    plt.close() 



def temperature_sampling(args, temperature=1.0):
    z_mean, z_log_var = args
    batch = tf.shape(z_mean)[0]
    dim = tf.shape(z_mean)[1]
    epsilon = tf.keras.backend.random_normal(shape=(batch, dim))
    # Apply the temperature to the random normal tensor
    epsilon *= temperature
    exp_term = tf.exp(0.5 * z_log_var)  # compute the exponential term once
    return z_mean + exp_term * epsilon


class KLDivergenceLayer(tf.keras.layers.Layer):

    def __init__(self, *args, **kwargs):
        self.is_placeholder = True
        super(KLDivergenceLayer, self).__init__(*args, **kwargs)

    def call(self, inputs):

        mu, log_var = inputs

        kl_batch = - .5 * K.sum(1 + log_var -
                                K.square(mu) -
                                K.exp(log_var), axis=-1)

        self.add_loss(K.mean(kl_batch), inputs=inputs)

        return inputs




def get_kfold_time_splits(v_files: List[Path], h_files: List[Path],
                     o_files: List[Path], m_files: List[Path],
                     hT_files: List[Path],
                     file_format: str = 'npy',
                     n_splits: int = 5) -> List[Tuple[dict, dict, dict]]:
    '''Split data into train, validation and test sets using K-fold cross-validation.
    If we specify n_splits=5, the split strategy will look something like this:
    Split 1: Train=[0], Test=[1]
    Split 2: Train=[0, 1], Test=[2]
    Split 3: Train=[0, 1, 2], Test=[3]
    Split 4: Train=[0, 1, 2, 3], Test=[4]
    Split 5: Train=[0, 1, 2, 3, 4], Test=[5]
    '''

    tscv = TimeSeriesSplit(n_splits=n_splits)
    data_splits = []

    for train_indices, test_indices in tscv.split(v_files):
        train_data = {
            'v_files': [v_files[i] for i in train_indices],
            'h_files': [h_files[i] for i in train_indices],
            'o_files': [o_files[i] for i in train_indices],
            'm_files': [m_files[i] for i in train_indices],
            'hT_files': [hT_files[i] for i in train_indices],
            'file_format': file_format,
        }

        test_data = {
            'v_files': [v_files[i] for i in test_indices],
            'h_files': [h_files[i] for i in test_indices],
            'o_files': [o_files[i] for i in test_indices],
            'm_files': [m_files[i] for i in test_indices],
            'hT_files': [hT_files[i] for i in test_indices],
            'file_format': file_format,
        }

        data_splits.append((train_data, test_data))

    return data_splits



class MusicDataGenerator(Sequence):
    def __init__(self, v_files, h_files, o_files, m_files, hT_files,
                 file_format='npy', batch_size=32, shuffle=True):
        self.v_files = v_files
        self.h_files = h_files
        self.o_files = o_files
        self.m_files = m_files
        self.hT_files = hT_files  # tap hits
        self.file_format = file_format
        self.batch_size = batch_size
        self.shuffle = shuffle
        self.on_epoch_end()

    def __len__(self):
        return len(self.v_files) // self.batch_size

    def __getitem__(self, index):
        start = index * self.batch_size
        end = (index + 1) * self.batch_size
        batch_v_files = self.v_files[start:end]
        batch_h_files = self.h_files[start:end]
        batch_o_files = self.o_files[start:end]
        batch_m_files = self.m_files[start:end]
        batch_hT_files = self.hT_files[start:end]

        v_batch = np.array([np.load(str(v_file)).astype(np.float32) for v_file in batch_v_files])
        h_batch = np.array([np.load(str(h_file)).astype(np.float32) for h_file in batch_h_files])
        o_batch = np.array([np.load(str(o_file)).astype(np.float32) for o_file in batch_o_files])
        m_batch = np.array([np.load(str(m_file)) for m_file in batch_m_files])
        hT_batch = np.array([np.load(str(hT_file)) for hT_file in batch_hT_files])  # tap hits

        #TODO: EKLE: 'input_metadata': m_batch, 

        inputs = {
            'input_tap_hits': hT_batch,
            'input_metadata': m_batch
        }
        outputs = {
            'output_hits': h_batch,
            'output_velocities': v_batch,
            'output_time_offsets': o_batch,
        }

        return inputs, outputs

    def on_epoch_end(self):
        if self.shuffle:
            zipped_data = list(
                zip(self.v_files, self.h_files, self.o_files, self.m_files, self.hT_files))
            np.random.shuffle(zipped_data)
            self.v_files, self.h_files, self.o_files, self.m_files, self.hT_files = zip(*zipped_data)


#########################
###DATA IMPORT & SPLIT###
#########################

# which machine runs the script?
print(f"This is your local machine: {args.lab}\n")
drum_path, tap_path = which_comp(laptop=args.lab, extended=args.extended)  # adjust

# Choose the file format
file_format = 'npy'

# Importing the paths. Then MusicDataGenerator obj will import the files on the fly
v_files = sorted([d for d in Path(drum_path).glob(f'v_matrices/*.{file_format}')])
h_files = sorted([d for d in Path(drum_path).glob(f'h_matrices/*.{file_format}')])
o_files = sorted([d for d in Path(drum_path).glob(f'o_matrices/*.{file_format}')])
m_files = sorted([d for d in Path(drum_path).glob(f'm_matrices/*.{file_format}')])
hT_files = sorted([d for d in Path(tap_path).glob(f'h_matrices/*.{file_format}')])

print(f'{len(v_files)} V-matrix, {len(h_files)} H-matrix, {len(o_files)} O-matrix, and {len(m_files)} M-matrix of drum data together\n\
with their {len(hT_files)} tapH-matrix tap data pairs are imported as {file_format.upper()} paths.\n')


# NOTE: Use this with MusicDataGenerator
# SPLIT DATASET w/ kfold
kfold_splits = get_kfold_time_splits(v_files, h_files, o_files, m_files, hT_files,
                                file_format=file_format, n_splits=model_config['N_SPLITS'])
data_generators = []
train_data, test_data = kfold_splits[0]
# Initialize first train and validation generators outside the loop.
train_generator = MusicDataGenerator(train_data['v_files'], train_data['h_files'], train_data['o_files'], train_data['m_files'],
                                     train_data['hT_files'],
                                     file_format=train_data['file_format'], batch_size=model_config['BATCH_SIZE'])

val_generator = MusicDataGenerator(test_data['v_files'], test_data['h_files'], test_data['o_files'], test_data['m_files'],
                                   test_data['hT_files'],
                                   file_format=test_data['file_format'], batch_size=model_config['BATCH_SIZE'])

print(f"Nr of kfold splits: {len(kfold_splits)}")
# Loop over the remaining splits.
for i in range(1, len(kfold_splits)):
    # Get current train and test data.
    train_data, test_data = kfold_splits[i]

    # Create train generator with current train data.
    train_generator = MusicDataGenerator(train_data['v_files'], train_data['h_files'], train_data['o_files'], train_data['m_files'],
                                         train_data['hT_files'],
                                         file_format=train_data['file_format'], batch_size=model_config['BATCH_SIZE'])

    # Create test generator with current test data.
    test_generator = MusicDataGenerator(test_data['v_files'], test_data['h_files'], test_data['o_files'], test_data['m_files'],
                                        test_data['hT_files'],
                                        file_format=test_data['file_format'], batch_size=model_config['BATCH_SIZE'])

    # Add current train, validation, and test generators to list.
    data_generators.append((train_generator, val_generator, test_generator))

    # Update validation generator for next iteration.
    val_generator = test_generator

print(f"{len(data_generators)} data generators of {len(data_generators[0])} indices are created for each K-Fold split.\n")


# MODEL
now = datetime.datetime.now()
now_time = now.strftime("%Y-%d-%m_%H-%M-%S")
model_name = f"dB_{now_time}_{model_config['model_type']}"
model_dir = './models/'
filepath = model_dir + model_name + '.h5'
print(f"{model_name} will be saved at {filepath}")

# Inputs
input_tap_hits = Input(shape=(model_config['num_timesteps'], 1), name="input_tap_hits")
input_metadata = Input(shape=(model_config['num_metadata'],), name="input_metadata")
print(f"Input tap hits for the encoder:\n{input_tap_hits}\n")
metadata_repeat = RepeatVector(model_config['num_timesteps'])(input_metadata) # Prepare metadata for conditioning the encoder and decoder

# TODO:  experiment with other initializers like 'glorot_uniform' or 'he_uniform'

# ENCODER
# Combine input sequence with metadata
combined_input_sequence = Concatenate()([input_tap_hits, metadata_repeat]) # Conditioning w metadata
print(f"Conditioned tap inputs for the decoder:\n{combined_input_sequence}\n")
tap_encoder_l1 = Bidirectional(LSTM(model_config['ENC_UNITS'], return_sequences=False, kernel_initializer='random_normal', recurrent_initializer='orthogonal', bias_initializer='zeros'), name='enc_bidirectional')(combined_input_sequence)
tap_encoder_l2 = Dropout(model_config['enc_D_OUT'], name='enc_dout1')(tap_encoder_l1)
# tap_encoder = Model(input_tap_hits, tap_encoder_l2)


# Intermediate layers (latent space)
z_mean = Dense(model_config['LATENT_DIM'], kernel_regularizer=l2(model_config['L2_REG']), kernel_initializer='random_normal', name='z_mean')(tap_encoder_l2)
z_log_var = Dense(model_config['LATENT_DIM'], kernel_regularizer=l2(model_config['L2_REG']), kernel_initializer='random_normal', name='z_log_var')(tap_encoder_l2)
z = Lambda(lambda args: temperature_sampling(args, temperature=0.5))([z_mean, z_log_var])
print(f"Latent space:\n{z}\n")

#define the encoder model and ins & outs
encoder = Model(inputs=[input_tap_hits, input_metadata], outputs=[z, z_mean, z_log_var], name='encoder')
z, z_mean, z_log_var = encoder([input_tap_hits,  input_metadata])


# Decoder inputs
dense_z_condition = Dense(model_config['DENSE_DIM'], activation='relu', kernel_regularizer=l2(model_config['L2_REG']), kernel_initializer='random_normal', name='dense_z')(z)
dense_z_repeat = RepeatVector(model_config['num_timesteps'])(dense_z_condition)
combined_decoder_input = Concatenate(axis=-1)([dense_z_repeat, metadata_repeat]) # Combine latent representation and metadata
combined_transformed_input = Concatenate()([combined_decoder_input, input_tap_hits]) # Combine transformed input with original input # the original inputs are "skipped" over the encoder and provided directly to the decoder to capture all the necessary information for the decoder to generate the outputs.
print(f"Combined transformed input for the decoder:\n{combined_transformed_input}\n")
# TODO:  experiment with other initializers like 'glorot_uniform' or 'he_uniform'

# DECODER
decoder_l1 = LSTM(model_config['DEC_UNITS'], return_sequences=True, kernel_initializer='random_normal', recurrent_initializer='orthogonal', bias_initializer='zeros', name='dec_lstm1')(combined_transformed_input)
decoder_l1 = Dropout(model_config['dec_D_OUT'], name='dec_dout1')(decoder_l1) # check the xtra in dropout
decoder_l2 = LSTM(model_config['DEC_UNITS'], return_sequences=True, kernel_initializer='random_normal', recurrent_initializer='orthogonal', bias_initializer='zeros', name='dec_lstm2')(decoder_l1)
decoder_l2 = Dropout(model_config['dec_D_OUT'], name='dec_dout2')(decoder_l2) # comment out for less layers
# decoder_l3 = LSTM(model_config['DEC_UNITS'], return_sequences=True, name='dec_lstm3')(decoder_l2) # comment out for less layers
combined_decoder_output = Dropout(model_config['dec_D_OUT'], name='dec_dout3')(decoder_l2) # check the xtra in dropout
print(f"Combined decoder output:\n{combined_decoder_output}\n")

# Output
hits_decoder_output = TimeDistributed(Dense(model_config['num_instruments'], activation='softmax', kernel_regularizer=l2(model_config['L2_REG']), 
                                            kernel_initializer='random_normal', bias_initializer='zeros'))(combined_decoder_output)
velocities_decoder_output = TimeDistributed(Dense(model_config['num_instruments'], activation='sigmoid', kernel_regularizer=l2(model_config['L2_REG']), 
                                                kernel_initializer='random_normal', bias_initializer='zeros'))(combined_decoder_output)
time_offsets_decoder_output = TimeDistributed(Dense(model_config['num_instruments'], activation='tanh', kernel_regularizer=l2(model_config['L2_REG']),
                                                    kernel_initializer='random_normal', bias_initializer='zeros'))(combined_decoder_output)

# define the decoder model and ins & outs
decoder = Model(inputs=[input_tap_hits, z, input_metadata], outputs=[hits_decoder_output, velocities_decoder_output, time_offsets_decoder_output], name='decoder')
hits_decoder_output, velocities_decoder_output, time_offsets_decoder_output = decoder([input_tap_hits, z, input_metadata])


# VAE
hits_output = Reshape((model_config['num_timesteps'], model_config['num_instruments']), name='output_hits')(hits_decoder_output)
velocities_output = Reshape((model_config['num_timesteps'], model_config['num_instruments']), name='output_velocities')(velocities_decoder_output)
time_offsets_output = Reshape((model_config['num_timesteps'], model_config['num_instruments']), name='output_time_offsets')(time_offsets_decoder_output)

# define the VAE model and ins & outs
db_vae = Model(inputs=[input_tap_hits, input_metadata], outputs=[hits_output, velocities_output, time_offsets_output], name='tap2drum_vae')


# Loss functions
@tf.function
def H_loss(y_true, y_pred):
    return tf.keras.losses.categorical_crossentropy(y_true, y_pred) #changed from binary

@tf.function
def V_loss(y_true, y_pred):
    return tf.keras.losses.mean_squared_error(y_true, y_pred)

@tf.function
def O_loss(y_true, y_pred):
    return tf.keras.losses.mean_squared_error(y_true, y_pred)

def kl_loss(z_mean, z_log_var, beta=1.0):
    kl_loss = -0.5 * K.sum(1 + z_log_var - K.square(z_mean) - K.exp(z_log_var), axis=-1)
    kl_loss = K.mean(kl_loss)
    kl_loss *= beta
    db_vae.add_metric(kl_loss, name='kl_loss', aggregation='mean')
    return kl_loss

# NOTE: kl_loss requires symbolic tensors (KerasTensor) z_mean and z_log_var as inputs, 
# which are calculated as intermediate results during your model's computation. 
# However, symbolic tensors are not allowed in functions decorated with @tf.function, 
# which is meant for eager execution.

# take the mean of kl_loss before adding it to the model's loss to scale the kl_loss to be in the same range as the other loss terms
kl_term = kl_loss(z_mean, z_log_var, beta=model_config['kl_weight'])
db_vae.add_loss(K.mean(kl_term)) # TODO: comment out if using the custom KL layer!

optimizer = tf.keras.optimizers.Adam(learning_rate=model_config['initial_learning_rate'], clipnorm=model_config['clip_norm'])
db_vae.compile(optimizer=optimizer, 
              loss={'output_hits': H_loss, 
                    'output_velocities': V_loss, 
                    'output_time_offsets': O_loss},
              loss_weights={'output_hits': 1.0, 
                            'output_velocities': 1.0, 
                            'output_time_offsets': 1.0})

db_vae.summary()

#-----------------------------------
#-----------------------------------
#-----------------------------------
#TRAIN#

try:
    for fold_idx, (train_gen_kf, val_gen_kf, _) in enumerate(data_generators):
        print(f'\nTraining fold {fold_idx + 1}...')

        if fold_idx > 0:
            db_vae = Model(inputs=[input_tap_hits, input_metadata], outputs=[hits_output, velocities_output, time_offsets_output])
            kl_term = kl_loss(z_mean, z_log_var, beta=model_config['kl_weight'])
            db_vae.add_loss(K.mean(kl_term))
            optimizer = tf.keras.optimizers.Adam(learning_rate=model_config['initial_learning_rate'], clipnorm=model_config['clip_norm'])
            db_vae.compile(optimizer=optimizer, 
                            loss={'output_hits': H_loss, 
                                    'output_velocities': V_loss, 
                                    'output_time_offsets': O_loss},
                            loss_weights={'output_hits': 1.0, 
                                            'output_velocities': 1.0, 
                                            'output_time_offsets': 1.0})

        if fold_idx == 0:
            stream = io.StringIO()
            sys.stdout = stream
            db_vae.summary()
            sys.stdout = sys.__stdout__
            model_config["model_summary"] = stream.getvalue()

        checkpoint_filepath = f'checkpoints/model_weights_fold_{fold_idx + 1}.h5'
        checkpoint_callback = ModelCheckpoint(filepath=checkpoint_filepath, 
                                            monitor='val_loss', 
                                            save_best_only=True, 
                                            mode='min', 
                                            save_freq=model_config['BATCH_SIZE'] * 4,
                                            verbose=1)

        early_stopping_callback = EarlyStopping(monitor='val_loss', patience=35, mode='min', verbose=1)

        log_dir = os.path.join('logs', f'fold_{fold_idx + 1}', now_time)
        tensorboard_callback = TensorBoard(log_dir=log_dir, 
                                            histogram_freq=1,
                                            write_graph=True,
                                            write_images=True,
                                            update_freq=model_config['BATCH_SIZE'] * 4)

        callbacks = [checkpoint_callback, early_stopping_callback, tensorboard_callback]

        history = db_vae.fit(x=train_gen_kf, 
                            validation_data=val_gen_kf, 
                            steps_per_epoch=len(train_gen_kf),
                            validation_steps=len(val_gen_kf),
                            epochs=model_config['NUM_EPOCHS'], 
                            callbacks=callbacks)
        
        # Plot and save the losses for the current fold
        plot_losses(history, fold_idx)

        try:
            #Save the model
            filepath = model_dir + model_name + f'_fold_{fold_idx + 1}' + '.h5'
            db_vae.save(filepath) # Uncomment this to save
        except Exception as e:
            print(f'Error occurred during saving the model: {e}')

        # Reset things.... # 
        # del train_gen_kf
        # del val_gen_kf
        # gc.collect()
        print(f"Completed fold {fold_idx + 1}")

except Exception as e:
    print(f'Error occurred during training: {e}')

finally:
    print("Finally...")
    # This code will be executed no matter if an error occurs or not
    #-------------------------------------------------------------------------------------------------------------
    #Save the test data split by kfold.
    test_data_dir = os.path.join(model_dir, model_name + '_test_split')
    if not os.path.exists(test_data_dir):
        os.mkdir(test_data_dir)
        print(f"\nTest data dir created at {test_data_dir}")
    else:
        print(f'\nTest data directory already exists!')
        #TODO: add a line to log the exception to a file

    # Save the test data indices
    print(f"\nSaving the TEST data indices")
    for fold in range(model_config['N_SPLITS']-1):
        for i, test_indices in enumerate(data_generators[fold][2]):
            if i == 0:
                print(f"Saving fold{fold}...")
            name = f'test_indices_split_{fold}_{i+1}.npy'
            tindice = os.path.join(test_data_dir, name)
            np.save(tindice, test_indices)
    print(f'\nAll test indices are saved to disk at {test_data_dir}')

    # Extract the layer configurations from the model
    layers = {}
    for layer in db_vae.layers:
        if not isinstance(layer, tf.keras.layers.InputLayer):
            layers[layer.name] = layer.get_config()
    # Save the model details, hyperparameters, and layers to a JSON file
    with open(model_dir + model_name + '.json', "w") as f:
        model_config["layers"] = layers
        json.dump(model_config, f, indent=4)
    print(
        f'\nModel summary and hyperparams are saved to disk at {model_dir + model_name + ".json"}\n')