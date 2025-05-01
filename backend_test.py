import requests
import sys
import uuid
from datetime import datetime, timedelta

class ItineraryAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user = f"test_user_{uuid.uuid4().hex[:8]}"
        self.test_password = "TestPass123!"
        self.test_email = f"{self.test_user}@example.com"
        self.test_full_name = "Test User"
        self.event_id = None
        self.notification_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register(self):
        """Test user registration"""
        data = {
            "username": self.test_user,
            "password": self.test_password,
            "email": self.test_email,
            "full_name": self.test_full_name,
            "role": "user"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "users",
            200,
            data=data
        )
        
        if success and "id" in response:
            self.user_id = response["id"]
            print(f"Created user with ID: {self.user_id}")
            return True
        return False

    def test_login(self):
        """Test login and get token"""
        # The API uses OAuth2 password flow which requires form data
        url = f"{self.base_url}/api/token"
        
        print(f"\n🔍 Testing Login...")
        try:
            response = requests.post(
                url,
                data={
                    "username": self.test_user,
                    "password": self.test_password
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                self.tests_run += 1
                self.tests_passed += 1
                data = response.json()
                self.token = data.get("access_token")
                print(f"✅ Passed - Status: {response.status_code}")
                print(f"Obtained token: {self.token[:10]}...")
                return True
            else:
                self.tests_run += 1
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False
        except Exception as e:
            self.tests_run += 1
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "users/me",
            200
        )
        return success

    def test_create_event(self):
        """Test creating an event"""
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        data = {
            "title": "Test Event",
            "description": "This is a test event",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "venue": "Test Venue",
            "priority": "medium",
            "recurrence": "none",
            "participants": []
        }
        
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            data=data
        )
        
        if success and "id" in response:
            self.event_id = response["id"]
            print(f"Created event with ID: {self.event_id}")
            return True
        return False

    def test_get_events(self):
        """Test getting events"""
        success, response = self.run_test(
            "Get Events",
            "GET",
            "events",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} events")
            return True
        return False

    def test_get_event_by_id(self):
        """Test getting a specific event by ID"""
        if not self.event_id:
            print("❌ No event ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Event by ID",
            "GET",
            f"events/{self.event_id}",
            200
        )
        return success

    def test_update_event(self):
        """Test updating an event"""
        if not self.event_id:
            print("❌ No event ID available for testing")
            return False
            
        data = {
            "title": "Updated Test Event",
            "description": "This is an updated test event"
        }
        
        success, response = self.run_test(
            "Update Event",
            "PUT",
            f"events/{self.event_id}",
            200,
            data=data
        )
        return success

    def test_delete_event(self):
        """Test deleting an event"""
        if not self.event_id:
            print("❌ No event ID available for testing")
            return False
            
        success, _ = self.run_test(
            "Delete Event",
            "DELETE",
            f"events/{self.event_id}",
            200
        )
        return success
        
    def test_get_notifications(self):
        """Test getting user notifications"""
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "notifications",
            200
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} notifications")
            if len(response) > 0:
                self.notification_id = response[0]["id"]
                print(f"First notification: {response[0]['title']} - {response[0]['message']}")
                print(f"Read status: {response[0]['read']}")
                return True
            else:
                print("No notifications found")
                return False
        return False
        
    def test_mark_notification_as_read(self):
        """Test marking a notification as read"""
        if not self.notification_id:
            print("❌ No notification ID available for testing")
            return False
            
        success, _ = self.run_test(
            "Mark Notification as Read",
            "PUT",
            f"notifications/{self.notification_id}/read",
            200
        )
        
        if success:
            # Verify the notification is now marked as read
            get_success, response = self.run_test(
                "Verify Notification Read Status",
                "GET",
                "notifications",
                200
            )
            
            if get_success and isinstance(response, list):
                for notification in response:
                    if notification["id"] == self.notification_id:
                        if notification["read"]:
                            print("✅ Notification successfully marked as read")
                            return True
                        else:
                            print("❌ Notification not marked as read")
                            return False
            
            print("❌ Could not verify notification read status")
            return False
        
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Itinerary Management System API Tests")
        
        # Test user registration and authentication
        if not self.test_register():
            print("❌ Registration failed, stopping tests")
            return 1
            
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return 1
            
        if not self.test_get_user_profile():
            print("❌ Getting user profile failed")
            
        # Test event management
        if not self.test_create_event():
            print("❌ Event creation failed, skipping related tests")
        else:
            self.test_get_events()
            self.test_get_event_by_id()
            self.test_update_event()
            self.test_delete_event()
        
        # Print results
        print(f"\n📊 Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://17f89ba1-fcf2-4087-ae44-02552831c53c.preview.emergentagent.com"
    
    # Run the tests
    tester = ItineraryAPITester(backend_url)
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())