import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow logging
import tensorflow as tf
import cv2
import numpy as np
from models.object_detection.utils import label_map_util
import time as t
import datetime
from cam1.fire_detection import base_folder_path, image_folder

from cam1.database_connection import weapon_database
from collections import deque

# Directory and Path Setup
current_dir = os.getcwd()
folder_name = "Detected Images"
base_folder_path = os.path.join(os.path.dirname(current_dir), folder_name)
event = "weapon"
image_folder = "image"
video_folder = "video"

# Constants
MIN_CONF_THRESH = 0.3
RESIZE_WIDTH = 320
RESIZE_HEIGHT = 320
weaon_labels = {1: 'weapon'}

# Model Paths
PATH_TO_MODEL_DIR = os.path.join(current_dir, "models", "weapon","weapon_model1")
PATH_TO_LABELS = os.path.join(PATH_TO_MODEL_DIR, 'label_map.pbtxt')
PATH_TO_SAVED_MODEL = os.path.join(PATH_TO_MODEL_DIR, "saved_model")

# Load Model and Labels Once
detect_fn = tf.saved_model.load(PATH_TO_SAVED_MODEL)
category_index = label_map_util.create_category_index_from_labelmap(PATH_TO_LABELS, use_display_name=True)

# Frame Buffer and Event Tracking
frame_buffer = deque(maxlen=300)  # 5 seconds worth of frames (assuming 30 FPS)
event_frame_indices = []
last_event_time = None  # To track when the last event was detected
event_cooldown = 60  # Cooldown period in seconds to avoid duplicate entries


def create_folder_according_date(base_folder, cameraname):
    """Create necessary folders for saving data based on the current date and time."""
    model_folder = "weapon"
    System_time = t.localtime(t.time())
    current_date = f"{System_time[0]}-{System_time[1]:02d}-{System_time[2]:02d}"
    image_time = f"{System_time[3]:02d}-{System_time[4]:02d}"
    date_for_image = current_date.replace("-", "_")
    time_for_image = image_time.replace("-", "_")

    weapon_folder_path = os.path.join(base_folder, model_folder, current_date, cameraname, image_time,image_folder)
    weapon_video_folder_path = os.path.join(base_folder, model_folder, current_date, cameraname,image_time ,video_folder)
    
    os.makedirs(weapon_folder_path, exist_ok=True)
    os.makedirs(weapon_video_folder_path, exist_ok=True)

    return weapon_folder_path, date_for_image, time_for_image, weapon_video_folder_path


def weapon_get_frame(frame, cameraname, camlocation, date, time, camip, serverip, fps):
    """Process each frame for fire detection and handle image/video storage."""
    global last_event_time  # Track the last time the event was processed
    now = datetime.datetime.now()

    # Resize frame and convert to RGB
    resized_frame = cv2.resize(frame, (RESIZE_WIDTH, RESIZE_HEIGHT))
    frame_rgb = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2RGB)

    # Perform inference
    input_tensor = tf.convert_to_tensor(np.expand_dims(frame_rgb, axis=0), dtype=tf.uint8)
    detections = detect_fn(input_tensor)

    # Convert detections to numpy arrays
    num_detections = int(detections.pop('num_detections'))
    detections = {key: value[0, :num_detections].numpy() for key, value in detections.items()}
    detections['num_detections'] = num_detections
    detections['detection_classes'] = detections['detection_classes'].astype(np.int64)

    # Process detections
    for i in range(num_detections):
        class_id = int(detections['detection_classes'][i])
        score = detections['detection_scores'][i]

        if score >= MIN_CONF_THRESH:
            # Get box coordinates and label
            ymin, xmin, ymax, xmax = detections['detection_boxes'][i]
            xmin = int(xmin * RESIZE_WIDTH)
            xmax = int(xmax * RESIZE_WIDTH)
            ymin = int(ymin * RESIZE_HEIGHT)
            ymax = int(ymax * RESIZE_HEIGHT)
            label = f'{category_index[class_id]["name"]}'

            # Create folder and save path
            path_date_time_for_image_save = create_folder_according_date(base_folder_path, cameraname)
            image_path = f"{path_date_time_for_image_save[0]}/{path_date_time_for_image_save[1]}_{path_date_time_for_image_save[2]}_{label}.jpg"

            # Draw bounding box and label
            cv2.rectangle(resized_frame, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)
            cv2.putText(resized_frame, label, (xmin, ymin - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            # Only save the event once if it hasn't been processed in the last `event_cooldown` seconds
            current_time = t.time()
            if last_event_time is None or (current_time - last_event_time) > event_cooldown:
                # Save detected image
                image_saved = cv2.imwrite(image_path, resized_frame)

                if image_saved:
                    # Store the frame index for event processing
                    event_frame_indices.append(len(frame_buffer) - 1)

                    # Create video file around the detected event
                    start_frame = max(0, event_frame_indices[-1] - 150)  # 5 seconds before the event
                    end_frame = min(len(frame_buffer), event_frame_indices[-1] + 300)  # 5 seconds after the event
                    height, width, _ = resized_frame.shape
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    video_path = f"{path_date_time_for_image_save[3]}/detected.mp4"
                    print(f"fps : {fps}")
                    out = cv2.VideoWriter(video_path, fourcc, 15, (width, height))

                    for j in range(start_frame, end_frame):
                        out.write(frame_buffer[j])
                    out.release()

                    image_path = image_path.replace("\\","/")
                    video_path= video_path.replace("\\","/")
                    # Insert into the database after both image and video are saved
                    weapon_database(date, time, event, now, cameraname, camlocation, image_path, camip, serverip, videopath=video_path)

                    # Update the last event time
                    last_event_time = current_time

    # Update the frame buffer and display the current frame
    frame_buffer.append(resized_frame)
    cv2.imshow('weapon Detection', resized_frame)
