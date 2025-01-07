import requests
import time
import pymongo
base_url = "http://localhost:8000"
surveillance_mode_api_url = f"{base_url}/surveillance/status"

# try:
#     while True:
#         # Fetch data from the surveillance mode API
#         response = requests.get(surveillance_mode_api_url)


#         # Check if the response status code is 200 (success)
#         if response.status_code == 200 :
#             # Process the JSON data
#             surveillance_data = response.json()

#             # Print the fetched data
#             print("Surveillance Data:", surveillance_data)
#         else:
#             print(f"Error: {response.status_code}")

#         # Delay to avoid overwhelming the server
#         time.sleep(5)  # Check every 5 seconds
# except KeyboardInterrupt:
#     print("Stopped by the user.")
# except Exception as e:
#     print("An error occurred:", e)

import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017/")

database = client['Home_security']
camconfigurations_collection = database['camconfigurations']

query  = {'cameratype':"face_cam",'cam_id':0}
data1 = {"cameratype":"face_cam","usb":0 ,"url":"NUll",'cam_id':0}
camconfigurations_collection.insert_one(data1)

# data2 = {"cameratype":"incident_cam","usb":"NUll" ,"url":"F:\\Train_models\\Mobilenet_ssd_model\\training_ssd_model\\input_files\\fire\\fire_video.mp4",'cam_id':1}
# camconfigurations_collection.insert_one(data2)
# result = camconfigurations_collection.find_one(query)
# usb_vale = result.get('usb')
# print(usb_vale)