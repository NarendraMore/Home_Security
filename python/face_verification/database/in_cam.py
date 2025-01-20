
import cv2
import numpy as np
from inception_resnet_v1 import *
from scipy.spatial import distance
import pymongo
import os
from datetime import datetime, timedelta
import time as t
import re
import requests
import time

base_url = "http://localhost:8000"
surveillance_mode_api_url = f"{base_url}/surveillance/status"
unknown_immediate_person_api = f"{base_url}/generate"

client = pymongo.MongoClient('mongodb://localhost:27017/')
db1 = client['Home_security']

imagedata_table = db1['imagedata']

camera_table  = db1['camconfigurations']

DeviceAddress, ReaderNumber = 1107, 1

current_dir = os.getcwd()
detcted_face_data = "Detected Images"
in_folder = "IN_cam"
unknown_face_folder = "Unknown Persons"
image_folder = "Images"
video_folder = "Video"
cam_value = None
cap = None

# Configuration for retry mechanism
RETRY_DELAY = 5  # seconds
MAX_RETRIES = 0  # 0 for infinite retries

base_folder_path = os.path.join(os.path.dirname(current_dir), detcted_face_data)

# Track processed images and unknown detections
processed_images = set()
recording = False
video_writer = None
record_start_time = None
last_unknown_detection = None
grace_period = timedelta(seconds=10)  # Duration to consider subsequent detections as the same event

# Initialize InceptionResNetV1 and load weights
face_model_path = os.path.join(os.getcwd(), "facenet_weights.h5")
model = InceptionResNetV1()
model.load_weights(face_model_path)

cam_query = {"cameratype":"face_cam","cam_id":0}

# cap = cv2.VideoCapture(cam_value)  # Change to RTSP as needed
detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Preload embeddings
all_embeddings = list(imagedata_table.find({}, {"_id": 0}))


def get_camera_url():
    """Fetches the camera URL from the database."""
    query_result = camera_table.find_one(cam_query)

    if query_result:
        value=query_result.get('usb')
        return str(value)
    return None

def l2_normalize(x, axis=-1, epsilon=1e-10):
    """Normalize the input vector to unit length."""
    return x / np.sqrt(np.maximum(np.sum(np.square(x), axis=axis, keepdims=True), epsilon))

def preprocess(x):
    """Preprocess the image by standardizing it."""
    mean, std = np.mean(x), np.std(x)
    std_adj = max(std, 1.0 / np.sqrt(x.size))
    return (x - mean) / std_adj

def create_folder_according_date(base_folder, in_folder, face_folder, image_folder, video_folder):
    image_folder_path = os.path.join(base_folder, datetime.now().strftime("%Y-%m-%d"), in_folder, face_folder, image_folder)
    video_folder_path = os.path.join(base_folder, datetime.now().strftime("%Y-%m-%d"), in_folder, face_folder, video_folder)
    os.makedirs(image_folder_path, exist_ok=True)
    os.makedirs(video_folder_path, exist_ok=True)
    return image_folder_path, video_folder_path

def start_video_recording(video_path, frame_size, fps=20):
    """Initialize video writer to start recording."""
    fourcc = cv2.VideoWriter_fourcc(*'H246') #XVID
    return cv2.VideoWriter(video_path, fourcc, fps, frame_size)

def hash_embedding(embedding):
    """Generate a unique hash for a facial embedding."""
    return hash(tuple(np.round(embedding, decimals=4)))

# Add this global variable
is_recording_active = False

def process_frame(frame):
    global recording, video_writer, record_start_time, last_unknown_detection

    dt_obj = datetime.now()
    date1 = dt_obj.strftime("%d/%m/%Y")
    time1 = dt_obj.strftime("%T")
    img_time = dt_obj.strftime("%H:%M").replace(":", "_")
    img_date = date1.replace("/", "_")

    faces = detector.detectMultiScale(frame, scaleFactor=1.3, minNeighbors=5)
    for (x, y, w, h) in faces:
        roi = cv2.resize(frame[y:y+h, x:x+w], (160, 160))
        roi = preprocess(roi)
        embedding = l2_normalize(model.predict(np.expand_dims(roi, axis=0))[0])

        # Compare with cached embeddings
        min_dist, matched_name = float('inf'), None
        for person in all_embeddings:
            person_name = person['username']
            rep = np.array(re.findall(r'-?\d+\.\d+', person['data']), dtype=np.float32)
            dist = distance.euclidean(rep, embedding)
            if dist < min_dist:
                min_dist, matched_name = dist, person_name
        if min_dist < 0.8:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(frame, matched_name, (int(x), int(y-5)), 1, 1, (0, 255, 0), 2)
            recording = False  # Stop recording if known face is detected

        else:
            current_time = datetime.now()
            if last_unknown_detection and (current_time - last_unknown_detection) < grace_period:
                # Continue recording if within grace period
                if recording:
                    video_writer.write(frame)
            else:
                # Initialize last_unknown_detection for the first time
                last_unknown_detection = current_time
                try:
                    get_response = requests.get(surveillance_mode_api_url, timeout=5)
                    if get_response.status_code == 200:
                        data = get_response.json()
                        mode_status = data.get('status', 'off')
                        print(f"mode_status : {mode_status}")
                        if mode_status == "off":
                            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 1)
                            cv2.putText(frame, 'Unknown', (int(x), int(y-5)), 1, 1, (0, 0, 255), 1)
                            unknown_face_folder_path = create_folder_according_date(base_folder_path, in_folder, unknown_face_folder, image_folder, video_folder)
                            
                            image_path = os.path.join(unknown_face_folder_path[0], f"{img_date}_{img_time}.jpg")
                            video_path = os.path.join(unknown_face_folder_path[1], f"{img_date}_{img_time}.mp4")
                            
                            if image_path not in processed_images:
                                if cv2.imwrite(image_path, frame):  # Save the image and check success
                                    processed_images.add(image_path)  # Mark image as processed
                                    image_path = image_path.replace("\\", "/")
                                    
                                    # Start recording
                                    recording = True
                                    record_start_time = current_time
                                    last_unknown_detection = current_time
                                    video_writer = start_video_recording(video_path, (frame.shape[1], frame.shape[0]))
                                
                                    # Ensure video recording started successfully
                                    if video_writer:
                                        print("Recording started...")
                                    else:
                                        print("Failed to start video recording.")

                except requests.RequestException as e:
                    print(f"API request error: {e}")

    # Stop recording after 10 seconds and send API request
    if recording:
        elapsed_time = (datetime.now() - record_start_time).total_seconds()
        video_writer.write(frame)  # Write current frame to the video
        if elapsed_time >= 10:
            print("Recording completed. Stopping...")
            video_writer.release()  # Stop recording after 10 seconds
            recording = False

            # Confirm video and image exist, then send API request
            if os.path.exists(image_path) and os.path.exists(video_path):
                payload = {
                    "date": date1,
                    "time": time1,
                    "incident_type": "Unknown Person",
                    "image": image_path,
                    "video": video_path.replace("\\", "/")
                }

                try:
                    post_response = requests.post(unknown_immediate_person_api, json=payload, timeout=5)
                    if post_response.status_code == 200:
                        print("Response from API:", post_response.json())
                    else:
                        print(f"Error: {post_response.status_code} - {post_response.text}")
                except requests.RequestException as e:
                    print(f"API request error: {e}")

    return frame



# def process_frame(frame):
#     global recording, video_writer, record_start_time, last_unknown_detection

#     dt_obj = datetime.now()
#     date1 = dt_obj.strftime("%d/%m/%Y")
#     time1 = dt_obj.strftime("%T")
#     img_time = dt_obj.strftime("%H:%M").replace(":", "_")
#     img_date = date1.replace("/", "_")

#     faces = detector.detectMultiScale(frame, scaleFactor=1.3, minNeighbors=5)
#     for (x, y, w, h) in faces:
#         roi = cv2.resize(frame[y:y+h, x:x+w], (160, 160))
#         roi = preprocess(roi)
#         embedding = l2_normalize(model.predict(np.expand_dims(roi, axis=0))[0])

#         # Compare with cached embeddings
#         min_dist, matched_name = float('inf'), None
#         for person in all_embeddings:
#             person_name = person['username']
#             rep = np.array(re.findall(r'-?\d+\.\d+', person['data']), dtype=np.float32)
#             dist = distance.euclidean(rep, embedding)
#             if dist < min_dist:
#                 min_dist, matched_name = dist, person_name
#         if min_dist < 0.8:
#             cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
#             cv2.putText(frame, matched_name, (int(x), int(y-5)), 1, 1, (0, 255, 0), 2)
#             recording = False  # Stop recording if known face is detected

#         else:
#             current_time = datetime.now()
#             if last_unknown_detection and (current_time - last_unknown_detection) < grace_period:
#                 # Continue recording if within grace period
#                 if recording:
#                     video_writer.write(frame)
#             else:
#                 # Initialize last_unknown_detection for the first time
#                 last_unknown_detection = current_time
#                 try:
#                     get_response = requests.get(surveillance_mode_api_url, timeout=5)
#                     if get_response.status_code == 200:
#                         data = get_response.json()
#                         mode_status = data.get('status', 'off')
#                         print(f"mode_status : {mode_status}")
#                         if mode_status == "off":
#                             cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 1)
#                             cv2.putText(frame, 'Unknown', (int(x), int(y-5)), 1, 1, (0, 0, 255), 1)
#                             unknown_face_folder_path = create_folder_according_date(base_folder_path, in_folder, unknown_face_folder, image_folder, video_folder)
                            
#                             image_path = os.path.join(unknown_face_folder_path[0], f"{img_date}_{img_time}.jpg")
#                             video_path = os.path.join(unknown_face_folder_path[1], f"{img_date}_{img_time}.mp4")
                            
#                             if image_path not in processed_images:
#                                 if cv2.imwrite(image_path, frame):  # Save the image and check success
#                                     processed_images.add(image_path)  # Mark image as processed
#                                     image_path = image_path.replace("\\", "/")
                                    
#                                     # Start recording
#                                     recording = True
#                                     record_start_time = current_time
#                                     last_unknown_detection = current_time
#                                     video_writer = start_video_recording(video_path, (frame.shape[1], frame.shape[0]))
                                
#                                     # Ensure video recording started successfully
#                                     if video_writer:
#                                         payload = {
#                                             "date": date1,
#                                             "time": time1,
#                                             "incident_type": "Unknown Person",
#                                             "image": image_path,
#                                             "video": video_path.replace("\\", "/")  # Video path for the API
#                                         }

#                                         post_response = requests.post(unknown_immediate_person_api, json=payload, timeout=5)
#                                         if post_response.status_code == 200:
#                                             print("Response from API:", post_response.json())
#                                         else:
#                                             print(f"Error: {post_response.status_code}")
#                                     else:
#                                         print("Failed to start video recording.")

#                 except requests.RequestException as e:
#                     print(f"API request error: {e}")

#     # Stop recording after 10 seconds
#     if recording:
#         elapsed_time = (datetime.now() - record_start_time).total_seconds()
#         video_writer.write(frame)  # Write current frame to the video
#         if elapsed_time >= 10:
#             video_writer.release()  # Stop recording after 10 seconds
#             recording = False

#     return frame


while True:
    # Fetch the camera URL from the database
    cam_value = get_camera_url()

    if cam_value:
        print(f"Camera URL found: {cam_value}")
        
        if cap is None or not cap.isOpened():
            # Initialize or reinitialize the VideoCapture

            cam_value = int(cam_value)
            cap = cv2.VideoCapture(cam_value)
    else:
        print("Camera configuration not found. Waiting for configuration...")
        if cap and cap.isOpened():
            cap.release()  # Release the camera if it's open
        time.sleep(5)
        continue  # Skip the rest of the loop until a configuration is found

    ret, frame = cap.read()

    if ret:
        try:
            processed_frame = process_frame(frame)
            cv2.imshow("In-Camera", processed_frame)

        except Exception as e:
            print(f"Error during processing: {e}")
    else:
        print("Error reading frame. Re-checking configuration...")
        if cap and cap.isOpened():
            cap.release()  # Release the current VideoCapture
        time.sleep(5)  # Wait before retrying
        continue  # Retry fetching the camera configuration

    if cv2.waitKey(1) == ord('q'):
        print("Exiting...")
        break


# Cleanup
if video_writer is not None:
    video_writer.release()
cap.release()
cv2.destroyAllWindows()





# import cv2
# import numpy as np
# from inception_resnet_v1 import *
# from scipy.spatial import distance
# import pymongo
# import os
# from datetime import datetime, timedelta
# import time as t
# import re
# import requests
# import time

# base_url = "http://localhost:8000"
# surveillance_mode_api_url = f"{base_url}/surveillance/status"
# unknown_immediate_person_api = f"{base_url}/generate"

# client = pymongo.MongoClient('mongodb://localhost:27017/')
# db1 = client['Home_security']

# imagedata_table = db1['imagedata']

# camera_table  = db1['camconfigurations']

# DeviceAddress, ReaderNumber = 1107, 1

# current_dir = os.getcwd()
# detcted_face_data = "Detected Images"
# in_folder = "IN_cam"
# unknown_face_folder = "Unknown Persons"
# image_folder = "Images"
# video_folder = "Video"
# cam_value = None
# cap = None

# # Configuration for retry mechanism
# RETRY_DELAY = 5  # seconds
# MAX_RETRIES = 0  # 0 for infinite retries

# base_folder_path = os.path.join(os.path.dirname(current_dir), detcted_face_data)

# # Track processed images and unknown detections
# processed_images = set()
# recording = False
# video_writer = None
# record_start_time = None
# last_unknown_detection = None
# grace_period = timedelta(seconds=10)  # Duration to consider subsequent detections as the same event

# # Initialize InceptionResNetV1 and load weights
# face_model_path = os.path.join(os.getcwd(), "facenet_weights.h5")
# model = InceptionResNetV1()
# model.load_weights(face_model_path)

# cam_query = {"cameratype":"face_cam","cam_id":0}

# # cap = cv2.VideoCapture(cam_value)  # Change to RTSP as needed
# detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# # Preload embeddings
# all_embeddings = list(imagedata_table.find({}, {"_id": 0}))


# def get_camera_url():
#     """Fetches the camera URL from the database."""
#     query_result = camera_table.find_one(cam_query)

#     if query_result:
#         value=query_result.get('usb')
#         return str(value)
#     return None

# def l2_normalize(x, axis=-1, epsilon=1e-10):
#     """Normalize the input vector to unit length."""
#     return x / np.sqrt(np.maximum(np.sum(np.square(x), axis=axis, keepdims=True), epsilon))

# def preprocess(x):
#     """Preprocess the image by standardizing it."""
#     mean, std = np.mean(x), np.std(x)
#     std_adj = max(std, 1.0 / np.sqrt(x.size))
#     return (x - mean) / std_adj

# def create_folder_according_date(base_folder, in_folder, face_folder, image_folder, video_folder):
#     image_folder_path = os.path.join(base_folder, datetime.now().strftime("%Y-%m-%d"), in_folder, face_folder, image_folder)
#     video_folder_path = os.path.join(base_folder, datetime.now().strftime("%Y-%m-%d"), in_folder, face_folder, video_folder)
#     os.makedirs(image_folder_path, exist_ok=True)
#     os.makedirs(video_folder_path, exist_ok=True)
#     return image_folder_path, video_folder_path

# def start_video_recording(video_path, frame_size, fps=20):
#     """Initialize video writer to start recording."""
#     fourcc = cv2.VideoWriter_fourcc(*'H246') #XVID
#     return cv2.VideoWriter(video_path, fourcc, fps, frame_size)

# def hash_embedding(embedding):
#     """Generate a unique hash for a facial embedding."""
#     return hash(tuple(np.round(embedding, decimals=4)))

# # Add this global variable
# is_recording_active = False

# def process_frame(frame):
#     global recording, video_writer, record_start_time, last_unknown_detection
    
#     dt_obj = datetime.now()
#     date1 = dt_obj.strftime("%d/%m/%Y")
#     time1 = dt_obj.strftime("%T")
#     img_time = dt_obj.strftime("%H:%M").replace(":", "_")
#     img_date = date1.replace("/", "_")

#     faces = detector.detectMultiScale(frame, scaleFactor=1.3, minNeighbors=5)
#     for (x, y, w, h) in faces:
#         roi = cv2.resize(frame[y:y+h, x:x+w], (160, 160))
#         roi = preprocess(roi)
#         embedding = l2_normalize(model.predict(np.expand_dims(roi, axis=0))[0])

#         # Compare with cached embeddings
#         min_dist, matched_name = float('inf'), None
#         for person in all_embeddings:
#             person_name = person['username']
#             rep = np.array(re.findall(r'-?\d+\.\d+', person['data']), dtype=np.float32)
#             dist = distance.euclidean(rep, embedding)
#             if dist < min_dist:
#                 min_dist, matched_name = dist, person_name
#         if min_dist < 0.8:
#             cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
#             cv2.putText(frame, matched_name, (int(x), int(y-5)), 1, 1, (0, 255, 0), 2)
#             recording = False  # Stop recording if known face is detected

#         else:
#             current_time = datetime.now()
#             if last_unknown_detection and (current_time - last_unknown_detection) < grace_period:
#                 # Continue recording if within grace period
#                 if recording:
#                     video_writer.write(frame)
#             else:
#                 # Initialize last_unknown_detection for the first time
#                 last_unknown_detection = current_time
#                 try:
#                     get_response = requests.get(surveillance_mode_api_url, timeout=5)
#                     if get_response.status_code == 200:
#                         data = get_response.json()
#                         mode_status = data.get('status', 'off')
#                         print(f"mode_status : {mode_status}")
#                         if mode_status == "off":
#                             cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 1)
#                             cv2.putText(frame, 'Unknown', (int(x), int(y-5)), 1, 1, (0, 0, 255), 1)
#                             unknown_face_folder_path = create_folder_according_date(base_folder_path, in_folder, unknown_face_folder, image_folder, video_folder)
                            
#                             image_path = os.path.join(unknown_face_folder_path[0], f"{img_date}_{img_time}.jpg")
#                             video_path = os.path.join(unknown_face_folder_path[1], f"{img_date}_{img_time}.mp4")
                            
#                             if image_path not in processed_images:
#                                 if cv2.imwrite(image_path, frame):  # Save only the face ROI
#                                     processed_images.add(image_path)  # Mark image as processed
#                                     image_path = image_path.replace("\\", "/")
                                    
#                                     payload = {
#                                         "date": date1,
#                                         "time": time1,
#                                         "incident_type": "Unknown Person",
#                                         "image": image_path,
#                                         "video": video_path.replace("\\", "/")  # Video path for the API
#                                     }

#                                     post_response = requests.post(unknown_immediate_person_api, json=payload, timeout=5)
#                                     if post_response.status_code == 200:
#                                         print("Response from API:", post_response.json())
#                                     else:
#                                         print(f"Error: {post_response.status_code}")

#                             # Start recording
#                             recording = True
#                             record_start_time = current_time
#                             last_unknown_detection = current_time
#                             video_writer = start_video_recording(video_path, (frame.shape[1], frame.shape[0]))

#                 except requests.RequestException as e:
#                     print(f"API request error: {e}")

#     # Stop recording after 10 seconds
#     if recording:
#         elapsed_time = (datetime.now() - record_start_time).total_seconds()
#         video_writer.write(frame)  # Write current frame to the video
#         if elapsed_time >= 10:
#             video_writer.release()  # Stop recording after 10 seconds
#             recording = False

#     return frame


# while True:
#     # Fetch the camera URL from the database
#     cam_value = get_camera_url()

#     if cam_value:
#         print(f"Camera URL found: {cam_value}")
        
#         if cap is None or not cap.isOpened():
#             # Initialize or reinitialize the VideoCapture

#             cam_value = int(cam_value)
#             cap = cv2.VideoCapture(cam_value)
#     else:
#         print("Camera configuration not found. Waiting for configuration...")
#         if cap and cap.isOpened():
#             cap.release()  # Release the camera if it's open
#         time.sleep(5)
#         continue  # Skip the rest of the loop until a configuration is found

#     ret, frame = cap.read()

#     if ret:
#         try:
#             processed_frame = process_frame(frame)
#             cv2.imshow("In-Camera", processed_frame)

#         except Exception as e:
#             print(f"Error during processing: {e}")
#     else:
#         print("Error reading frame. Re-checking configuration...")
#         if cap and cap.isOpened():
#             cap.release()  # Release the current VideoCapture
#         time.sleep(5)  # Wait before retrying
#         continue  # Retry fetching the camera configuration

#     if cv2.waitKey(1) == ord('q'):
#         print("Exiting...")
#         break


# # Cleanup
# if video_writer is not None:
#     video_writer.release()
# cap.release()
# cv2.destroyAllWindows()
