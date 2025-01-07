import numpy as np
from matplotlib import pyplot as plt
import cv2
import scipy
from scipy.spatial import distance
import os
from os import listdir
from os.path import isfile, join
import json
import keras
from keras.models import Model, Sequential
from keras.layers import Input, Conv2D, MaxPooling2D, Flatten,Dense,GlobalAveragePooling2D,Lambda,add, Dropout, Activation,Concatenate,BatchNormalization
import numpy as np
from tensorflow.keras.preprocessing.image import load_img, save_img, img_to_array
from keras.applications.imagenet_utils import preprocess_input
from keras.preprocessing import image
from keras import backend as K
import pickle
import time
import base64
from PIL import Image
import io
import pymongo
# client1 = pymongo.MongoClient('mongodb://192.168.1.2:27017/')
from pymongo import MongoClient

client = pymongo.MongoClient('mongodb://localhost:27017/')
db1 = client['Home_security']
table2=db1['users']
table1=db1['imagedata']

# Constants
FACE_CONFIDENCE_THRESHOLD = 0.92

import mtcnn
from mtcnn.mtcnn import MTCNN
model2 = MTCNN(min_face_size = 10)
from inception_resnet_v1 import *
model = InceptionResNetV1()
model.load_weights('facenet_weights.h5')

def l2_normalize(x, axis=-1, epsilon=1e-10):
    output = x / np.sqrt(np.maximum(np.sum(np.square(x), axis=axis, keepdims=True), epsilon))
    return output

def preprocess(x):
    if x.ndim == 4:
        axis = (1, 2, 3)
        size = x[0].size
    elif x.ndim == 3:
        axis = (0, 1, 2)
        size = x.size
    else:
        raise ValueError('Dimension should be 3 or 4')
    mean = np.mean(x, axis=axis, keepdims=True)
    std = np.std(x, axis=axis, keepdims=True)
    std_adj = np.maximum(std, 1.0/np.sqrt(size))
    y = (x - mean) / std_adj
    return y

def faceinfo(image, margin=10):
    global roi
    image_np = np.array(image)
    face_info = model2.detect_faces(image_np)
    for face in face_info:
        if face['confidence'] > FACE_CONFIDENCE_THRESHOLD:
            x, y, w, h = face['box']
            x, y = abs(x), abs(y)
            face = image_np[y - margin // 2:y + h + margin // 2, x - margin // 2:x + w + margin // 2, :]
            roi = cv2.resize(face, (160, 160))
            break
    else:
        print("No face detected with sufficient confidence.")
        roi = None
    return roi

def add_photo(image_path, name):
    image_path = cv2.cvtColor(image_path, cv2.COLOR_BGR2RGB)
    im = faceinfo(image_path)
    
    if im is None:
        print(f"No valid face detected for {name}. Skipping registration.")
        return

    im2 = np.expand_dims(im, axis=0)
    im3 = l2_normalize(model.predict(preprocess(im2)))
    ab = np.array(im3[0], dtype=np.float32)
    document = {"username": name, "data": str(ab)}
    
    # Check if the user already exists in the database
    user = table1.find_one({"username": name})
    if user:
        print(f"User {name} is already registered in the system.")
    else:
        table1.insert_one(document)
        print(f"User {name} registered successfully.")

# Existing usernames cache
existing_users = {user['username'] for user in table1.find({}, {"username": 1})}



def stringToRGB(base64_string):
    try:
        image1 = Image.open(io.BytesIO(base64_string))
        if isinstance(image1, Image.Image):
            image_np = np.array(image1)
        else:
            # Convert bytes to numpy array
            image_np = np.frombuffer(image1, dtype=np.uint8)
    
        # Ensure that the image is in RGB format if needed
        if len(image_np.shape) == 2:
            # Grayscale image, convert to RGB
            image_np = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
        elif len(image_np.shape) == 3 and image_np.shape[2] == 4:
            # RGBA image, convert to RGB
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)

        return image_np
    except Exception as e:
        print("Error decoding image:", e)
        return None

# Process records
def process_new_records():
    cursor = table2.find()
    for rec in cursor:
        user_id = rec['user_id']
        print(f"Processing record for user_id: {user_id}")
        f = rec['image']
        
        if f:
            image1 = stringToRGB(f['data'])
            if image1 is not None:
                if user_id in existing_users:
                    print(f"User {user_id} is already registered.")
                else:
                    add_photo(image1, user_id)
                    existing_users.add(user_id)
            else:
                print(f"Failed to decode image for empid: {user_id}.")
        else:
            continue

if __name__ == "__main__":
    try:
        while True:
            process_new_records()
            print("Waiting for new records...")
            time.sleep(30)  # Check for new records every 10 seconds
    except KeyboardInterrupt:
        print("Exiting the continuous process.")