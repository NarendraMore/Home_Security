import cv2
# import numpy as np
# from inception_resnet_v1 import *
# from scipy.spatial import distance
# import pymongo
# import os
# import threading
# import queue
# import logging
# from datetime import datetime, timedelta
# import requests
# import time
# import re

# # Configure logging
# logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# # Database connection
# DB_URI = 'mongodb://localhost:27017/'
# DB_NAME = 'Home_security'
# client = pymongo.MongoClient(DB_URI)
# db = client[DB_NAME]
# imagedata_table = db['imagedata']
# camera_table = db['camconfigurations']

# # Constants
# BASE_URL = "http://localhost:8000"
# SURVEILLANCE_MODE_API_URL = f"{BASE_URL}/surveillance/status"
# UNKNOWN_PERSON_API_URL = f"{BASE_URL}/generate"

# DETECTED_FACE_DATA = "Detected Images"
# IN_FOLDER = "IN_cam"
# UNKNOWN_FACE_FOLDER = "Unknown Persons"
# IMAGE_FOLDER = "Images"
# VIDEO_FOLDER = "Video"

# RETRY_DELAY = 5  # seconds for API retries
# GRACE_PERIOD = timedelta(seconds=10)
# FRAME_QUEUE = queue.Queue(maxsize=10)  # Queue for frame processing

# # Globals
# processed_images = set()
# recording = False
# video_writer = None
# record_start_time = None
# last_unknown_detection = None

# # Load the InceptionResNetV1 model
# face_model_path = os.path.join(os.getcwd(), "facenet_weights.h5")
# model = InceptionResNetV1()
# model.load_weights(face_model_path)

# # Preload embeddings
# all_embeddings = list(imagedata_table.find({}, {"_id": 0}))

# # Camera configuration
# cam_query = {"cameratype": "face_cam", "cam_id": 0}

# # Helper functions
# def l2_normalize(x, axis=-1, epsilon=1e-10):
#     return x / np.sqrt(np.maximum(np.sum(np.square(x), axis=axis, keepdims=True), epsilon))

# def preprocess(x):
#     mean, std = np.mean(x), np.std(x)
#     std_adj = max(std, 1.0 / np.sqrt(x.size))
#     return (x - mean) / std_adj

# def create_folder(base_folder, sub_folders):
#     path = os.path.join(base_folder, *sub_folders)
#     os.makedirs(path, exist_ok=True)
#     return path

# def fetch_camera_url():
#     try:
#         query_result = camera_table.find_one(cam_query)
#         return query_result.get('usb') if query_result else None
#     except Exception as e:
#         logging.error(f"Error fetching camera URL: {e}")
#         return None

# def start_video_writer(video_path, frame_size, fps=20):
#     fourcc = cv2.VideoWriter_fourcc(*'H264')
#     return cv2.VideoWriter(video_path, fourcc, fps, frame_size)

# def compare_embeddings(embedding):
#     min_dist, matched_name = float('inf'), None
#     for person in all_embeddings:
#         person_name = person['username']
#         rep = np.array(re.findall(r'-?\d+\.\d+', person['data']), dtype=np.float32)
#         dist = distance.euclidean(rep, embedding)
#         if dist < min_dist:
#             min_dist, matched_name = dist, person_name
#     return min_dist, matched_name

# def process_frame(frame):
#     global recording, video_writer, record_start_time, last_unknown_detection
#     detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

#     faces = detector.detectMultiScale(frame, scaleFactor=1.3, minNeighbors=5)
#     for (x, y, w, h) in faces:
#         roi = cv2.resize(frame[y:y+h, x:x+w], (160, 160))
#         roi = preprocess(roi)
#         embedding = l2_normalize(model.predict(np.expand_dims(roi, axis=0))[0])

#         min_dist, matched_name = compare_embeddings(embedding)
#         if min_dist < 0.8:
#             cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
#             cv2.putText(frame, matched_name, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
#             recording = False
#         else:
#             handle_unknown_person(frame, x, y, w, h)

#     return frame

# def handle_unknown_person(frame, x, y, w, h):
#     global recording, video_writer, record_start_time, last_unknown_detection

#     current_time = datetime.now()
#     if last_unknown_detection and (current_time - last_unknown_detection) < GRACE_PERIOD:
#         if recording:
#             video_writer.write(frame)
#     else:
#         last_unknown_detection = current_time
#         image_folder = create_folder(DETECTED_FACE_DATA, [IN_FOLDER, UNKNOWN_FACE_FOLDER, IMAGE_FOLDER])
#         video_folder = create_folder(DETECTED_FACE_DATA, [IN_FOLDER, UNKNOWN_FACE_FOLDER, VIDEO_FOLDER])

#         img_name = f"{current_time.strftime('%Y%m%d_%H%M%S')}.jpg"
#         video_name = f"{current_time.strftime('%Y%m%d_%H%M%S')}.mp4"
#         img_path = os.path.join(image_folder, img_name)
#         video_path = os.path.join(video_folder, video_name)

#         if img_path not in processed_images:
#             cv2.imwrite(img_path, frame)
#             processed_images.add(img_path)
#             logging.info(f"Unknown person detected. Image saved at {img_path}")
#             video_writer = start_video_writer(video_path, (frame.shape[1], frame.shape[0]))
#             recording = True
#             record_start_time = current_time

# def frame_capture():
#     cam_url = fetch_camera_url()
#     if cam_url is None:
#         logging.error("Camera URL is None. Please check the database configuration.")
#         return  # Exit the function if the camera URL is invalid

#     try:
#         cap = cv2.VideoCapture(int(cam_url))
#         if not cap.isOpened():
#             logging.error(f"Unable to open camera at URL: {cam_url}")
#             return  # Exit if the camera cannot be opened

#         while cap.isOpened():
#             ret, frame = cap.read()
#             if ret and not FRAME_QUEUE.full():
#                 FRAME_QUEUE.put(frame)
#             elif not ret:
#                 logging.error("Error reading frame from camera.")
#                 break
#     except Exception as e:
#         logging.error(f"Error during frame capture: {e}")
#     finally:
#         if 'cap' in locals() and cap is not None:  # Check if cap is defined and valid
#             cap.release()
#             logging.info("Camera resource released.")


# def frame_processing():
#     while True:
#         if not FRAME_QUEUE.empty():
#             frame = FRAME_QUEUE.get()
#             try:
#                 processed_frame = process_frame(frame)
#                 cv2.imshow("Camera Stream", processed_frame)
#             except Exception as e:
#                 logging.error(f"Error processing frame: {e}")
#         if cv2.waitKey(1) & 0xFF == ord('q'):
#             break
#     cv2.destroyAllWindows()

# # Run threads
# capture_thread = threading.Thread(target=frame_capture, daemon=True)
# processing_thread = threading.Thread(target=frame_processing, daemon=True)

# capture_thread.start()
# processing_thread.start()

# capture_thread.join()
# processing_thread.join()

