import pymongo
import requests
client = pymongo.MongoClient('mongodb://localhost:27017/')
db = client['Home_security']         #hotel video analysis systeam
fire_table = db['fire']
weapon_table = db['weapon']
fight_table = db['fight']
events_table = db['events']

base_url = "http://localhost:8000"
surveillance_mode_api_url = f"{base_url}/surveillance/status"
incident_api = f"{base_url}/generate"

def fire_database(date,time,event,now,cameraname,camlocation,image_path,camip,serverip,videopath):
    fire_data={"date":date,"time":time,"event":event,"timestamp":now,"cameratype":cameraname,"location":camlocation,"imagepath":image_path,"videopath":videopath,"camip":camip,"serverip":serverip}
    """seperate fire databse insertion"""
    # fire_table.insert_one(fire_data)
    """For direct database data insertion"""
    # events_table.insert_one(fire_data)
    """Fire data payload"""
    fire_payload = {
                "date": date,
                "time": time,
                "incident_type": event,
                "image": image_path,
                "video": videopath  # Video path for the API
                    }

    """Insert data into database by using NODE API"""
    fire_post_response  = requests.post(incident_api,json=fire_payload)    
    if fire_post_response.status_code == 200:
        print(f"Fire data inserted successfully :{fire_post_response.json()}")
    else:
        print(f"Error inserting fire data :{fire_post_response.status_code}")

def weapon_database(date,time,event,now,cameraname,camlocation,image_path,camip,serverip,videopath):
    """ database direct connection and insert data """
    # weapon_data={"date":date,"time":time,"event":event,"timestamp":now,"cameratype":cameraname,"location":camlocation,"imagepath":image_path,"videopath":videopath,"camip":camip,"serverip":serverip}

    ## insert data into seperate database
    # weapon_table.insert_one(weapon_data)
    ## Insert data into data base directly
    # events_table.insert_one(weapon_data)

    """Insert data into database by using NODE API"""
    weapon_data_payload = {
                "date": date,
                "time": time,
                "incident_type": event,
                "image": image_path,
                "video": videopath  # Video path for the API
                }

    weapon_api_response = requests.post(incident_api,json=weapon_data_payload)

    if weapon_api_response.status_code == 200:
        print(f"Weapon data inserted successfully :{weapon_api_response.json()}")
    else:
        print(f"Error inserting weapon data :{weapon_api_response.status_code}")

def fight_database(date,time,event,now,cameraname,camlocation,image_path,camip,serverip,videopath):
    fight_data={"date":date,"time":time,"event":event,"timestamp":now,"cameratype":cameraname,"location":camlocation,"imagepath":image_path,"videopath":videopath,"camip":camip,"serverip":serverip}
    # fight_table.insert_one(fight_data)
    events_table.insert_one(fight_data)



