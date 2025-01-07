import cv2
import numpy as np
from datetime import datetime
import pymongo
import time
from cam1.sort import *
from cam1.fire_detection import fire_get_frame
from cam1.weapon_detection import weapon_get_frame

client = pymongo.MongoClient("mongodb://localhost:27017/")
db1 = client['Home_security']
camera_table = db1['camconfigurations']

cam_query = {"cameratype": "incident_cam", "cam_id": 1}
cam_value = None
cap = None

camlocation = 'Lobby'
cameraname = '114-Hoeywell'
camip='10.102.209.114'
serverip='10.102.209.250'



def get_camera_url():
    """Fetches the camera URL from the database."""
    query_result = camera_table.find_one(cam_query)
    if query_result:
        return query_result.get('url')
    return None

while True:
    # Fetch the camera URL from the database
    cam_value = get_camera_url()

    if cam_value:
        print(f"Camera URL found: {cam_value}")
        if cap is None or not cap.isOpened():
            # Initialize or reinitialize the VideoCapture
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
            now = datetime.now()
            date1 = now.strftime("%d/%m/%Y")
            time1 = now.strftime("%H:%M:%S")
            fps = cap.get(cv2.CAP_PROP_FPS)

            frame = cv2.resize(frame, (0, 0), fx=0.3, fy=0.3, interpolation=cv2.INTER_AREA)
            fire_get_frame(frame, cameraname, camlocation, date1, time1, camip, serverip, fps)
            weapon_get_frame(frame, cameraname,camlocation, date1, time1, camip, serverip, fps)

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

if cap and cap.isOpened():
    cap.release()
cv2.destroyAllWindows()

