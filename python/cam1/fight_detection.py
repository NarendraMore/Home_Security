import cv2
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from cam1.fire_detection import base_folder_path, image_folder
from cam1.database_connection import fight_database
import os
from collections import deque
import datetime
import time as t

event = "fight"
video_folder = "video"
current_dir = os.getcwd()
target_size = (64, 64)
num_frames = 5

# Load the trained model
model_path = os.path.join(current_dir, "models", "fight", "cnn_lstm_model_10_b8_64.h5")
model = load_model(model_path)

frame_buffer = deque(maxlen=300)  # Adjust maxlen as needed for 5 seconds of frames
event_frame_indices = []
last_entry_time = None  # To keep track of the last database entry time


def create_folder_according_date(base_folder, cameraname):
    System_time = t.localtime(t.time())
    current_date = "{yyyy}-{mm}-{dd}".format(yyyy=System_time[0], mm=System_time[1], dd=System_time[2])
    image_time = "{hr}-{min}".format(hr=System_time[3], min=System_time[4])

    Fight_folder_path = os.path.join(base_folder, event, current_date, cameraname, image_time, image_folder)
    Fight_video_folder_path = os.path.join(base_folder, event, current_date, cameraname, image_time, video_folder)

    os.makedirs(Fight_folder_path, exist_ok=True)
    os.makedirs(Fight_video_folder_path, exist_ok=True)

    return Fight_folder_path, Fight_video_folder_path, current_date.replace("-", "_"), image_time.replace("-", "_")


def preprocess_frame(frame, target_size=(64, 64)):
    frame = cv2.resize(frame, target_size)  # Resize the frame
    frame = img_to_array(frame) / 255.0     # Normalize pixel values
    return frame


def video_to_sequence(cap, num_frames=10, target_size=(64, 64)):
    sequence = []
    for _ in range(num_frames):
        ret, frame = cap.read()
        if not ret:
            return None, False  # No more frames available
        
        # Preprocess and add the frame to the sequence
        processed_frame = preprocess_frame(frame, target_size)
        sequence.append(processed_frame)
    
    return np.array(sequence), True


def fight_video_and_display(cap, cameraname, camlocation, date, time1, camip, serverip, fps, num_frames=10, target_size=(64, 64)):
    global last_entry_time  # Use global variable to track the last database entry time
    now = datetime.datetime.now()

    # Get a sequence of frames
    sequence, valid = video_to_sequence(cap, num_frames, target_size)

    if not valid:
        return  # Exit if no valid frames were obtained

    # Reshape sequence for model input (1, num_frames, width, height, channels)
    sequence = np.expand_dims(sequence, axis=0)

    # Predict the class (Fight or NoFight)
    prediction = model.predict(sequence)
    predicted_class = np.argmax(prediction, axis=1)[0]
    confidence_level = prediction[0][predicted_class]       

    # Read the first frame for overlaying text and saving
    ret, frame = cap.read()
    if not ret:
        return  # Exit if unable to read the frame

    if predicted_class == 1 and confidence_level >= 0.90:  # Assuming confidence threshold is 90%
        # Check if enough time has passed since the last entry
        if last_entry_time is None or (now - last_entry_time).seconds > 10:  # Change time as needed
            # If a fight is detected, prepare to save images and video
            path_date_time_for_image_save = create_folder_according_date(base_folder_path, cameraname)
            image_path = os.path.join(path_date_time_for_image_save[0], f"{path_date_time_for_image_save[2]}_{event}.jpg").replace("\\", "/")
            
            # Overlay text on the frame
            cv2.putText(frame, f"Fight Detected! Confidence: {confidence_level:.2f}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)

            # Save image
            if cv2.imwrite(image_path, frame):
                event_frame_indices.append(len(frame_buffer) - 1)
                start_frame = max(0, event_frame_indices[-1] - 150)  # 5 seconds before the event (assuming 30 FPS)
                end_frame = min(len(frame_buffer), event_frame_indices[-1] + 300)  # 5 seconds after the event

                height, width, layers = frame.shape
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # Or use other codec as needed
                video_path = os.path.join(path_date_time_for_image_save[1], 'detected.mp4')
                out = cv2.VideoWriter(video_path, fourcc, 15, (width, height))

                for i in range(start_frame, end_frame):
                    out.write(frame_buffer[i])
                
                out.release()

                image_path = image_path.replace("\\","/")
                video_path= video_path.replace("\\","/")

                # Store data in the database
                fight_database(date, time1, event, now, cameraname, camlocation, image_path, camip, serverip, video_path)
                last_entry_time = now  # Update last entry time

    # Append current frame to the buffer and show the frame
    frame_buffer.append(frame)
    frame = cv2.resize(frame, (640, 480))
    cv2.imshow("Video", frame)
