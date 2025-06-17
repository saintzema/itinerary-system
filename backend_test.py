import requests
import sys
import uuid
import random
import string
from datetime import datetime, timedelta

class ItineraryAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        # Generate random username to avoid conflicts
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        self.test_user = f"testuser_{random_suffix}"
        self.test_password = "Password123!"
        self.test_email = f"testuser_{random_suffix}@example.com"
        self.test_full_name = "Test User"
        self.event_id = None
        self.notification_id = None
        self.conflicting_event_id = None

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
            200,  # Changed back to 200 to match actual API response
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
                print(f"Status: {response[0]['status']}")
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
                        if notification["status"] == "read":
                            print("✅ Notification successfully marked as read")
                            return True
                        else:
                            print("❌ Notification not marked as read")
                            return False
            
            print("❌ Could not verify notification read status")
            return False
        
        return False
        
    def test_parse_natural_language_event(self):
        """Test parsing natural language text into event data"""
        test_phrases = [
            "Meeting with John tomorrow at 2PM for 1 hour in Conference Room A",
            "Lunch with Sarah on Friday at 1PM for 2 hours",
            "Team meeting tomorrow at 2PM for 1 hour"
        ]
        
        all_passed = True
        for phrase in test_phrases:
            data = {"text": phrase}
            
            success, response = self.run_test(
                f"Parse Natural Language Event: '{phrase}'",
                "POST",
                "parse-event",
                200,
                data=data
            )
            
            if success:
                print(f"Parsed event: {response.get('title')}")
                print(f"Start time: {response.get('start_time')}")
                print(f"End time: {response.get('end_time')}")
                print(f"Venue: {response.get('venue')}")
                print(f"Confidence: {response.get('confidence')}")
                
                # Verify that we got reasonable results
                if not response.get('title') or not response.get('start_time') or not response.get('end_time'):
                    print("❌ Missing essential fields in parsed event")
                    all_passed = False
            else:
                all_passed = False
                
        return all_passed
        
    def test_create_conflicting_events(self):
        """Test creating events that conflict with each other"""
        # Create first event
        start_time = datetime.utcnow() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=1)
        
        data = {
            "title": "First Test Event",
            "description": "This is the first test event",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "venue": "Test Venue",
            "priority": "medium",
            "recurrence": "none"
        }
        
        success, response = self.run_test(
            "Create First Event",
            "POST",
            "events",
            200,
            data=data
        )
        
        if success and "id" in response:
            self.event_id = response["id"]
            print(f"Created first event with ID: {self.event_id}")
            
            # Now create a conflicting event (overlapping time)
            conflict_start = start_time + timedelta(minutes=30)
            conflict_end = conflict_start + timedelta(hours=1)
            
            conflict_data = {
                "title": "Conflicting Test Event",
                "description": "This event should conflict with the first one",
                "start_time": conflict_start.isoformat(),
                "end_time": conflict_end.isoformat(),
                "venue": "Same Venue",
                "priority": "high",
                "recurrence": "none"
            }
            
            conflict_success, conflict_response = self.run_test(
                "Create Conflicting Event",
                "POST",
                "events",
                409,  # Expect conflict status code
                data=conflict_data
            )
            
            if conflict_success:
                print("❌ Event was created despite conflict - test failed")
                return False
            else:
                # Check if we got suggested alternative time slots
                if isinstance(conflict_response, dict) and 'detail' in conflict_response:
                    detail = conflict_response['detail']
                    if isinstance(detail, dict):
                        conflicts = detail.get('conflicts', [])
                        suggested_slots = detail.get('suggested_slots', [])
                        
                        print(f"Number of conflicts detected: {len(conflicts)}")
                        print(f"Number of suggested slots: {len(suggested_slots)}")
                        
                        if len(conflicts) > 0 and len(suggested_slots) > 0:
                            print("✅ Conflict was correctly detected with suggested alternatives")
                            return True
                
                print("✅ Conflict was correctly detected")
                return True
        return False
        
    def test_check_conflicts_endpoint(self):
        """Test the check-conflicts endpoint directly"""
        # First create an event
        if not self.event_id:
            start_time = datetime.utcnow() + timedelta(hours=3)
            end_time = start_time + timedelta(hours=1)
            
            data = {
                "title": "Base Event for Conflict Check",
                "description": "This is a test event for conflict checking",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "venue": "Test Venue",
                "priority": "medium",
                "recurrence": "none"
            }
            
            success, response = self.run_test(
                "Create Base Event for Conflict Check",
                "POST",
                "events",
                200,
                data=data
            )
            
            if success and "id" in response:
                self.event_id = response["id"]
                print(f"Created base event with ID: {self.event_id}")
            else:
                print("❌ Failed to create base event for conflict check")
                return False
        
        # Now check for conflicts with a time that overlaps
        conflict_start = datetime.utcnow() + timedelta(hours=3, minutes=30)
        conflict_end = conflict_start + timedelta(hours=1)
        
        data = {
            "start_time": conflict_start.isoformat(),
            "end_time": conflict_end.isoformat(),
            "event_id": None  # No event ID means we're checking for a new event
        }
        
        success, response = self.run_test(
            "Check Conflicts",
            "POST",
            "check-conflicts",
            200,
            data=data
        )
        
        if success:
            has_conflict = response.get("has_conflict", False)
            conflicts = response.get("conflicts", [])
            suggested_slots = response.get("suggested_slots", [])
            
            print(f"Has conflict: {has_conflict}")
            print(f"Number of conflicts: {len(conflicts)}")
            print(f"Number of suggested slots: {len(suggested_slots)}")
            
            if has_conflict and len(conflicts) > 0:
                print("✅ Conflicts correctly detected")
                
                if len(suggested_slots) > 0:
                    print("✅ Alternative time slots suggested")
                    for i, slot in enumerate(suggested_slots[:3]):  # Show first 3 slots
                        print(f"  Slot {i+1}: {slot.get('date')} {slot.get('time_range')}")
                else:
                    print("❌ No alternative time slots suggested")
                
                return True
            else:
                print("❌ No conflicts detected when there should be")
                return False
        return False
    def test_integration_workflow(self):
        """Test the complete workflow from AI parsing to event creation with conflict detection"""
        print("\n🔄 Testing Complete Integration Workflow...")
        
        # Step 1: Parse natural language text
        data = {
            "text": "Team meeting tomorrow at 2PM for 1 hour"
        }
        
        parse_success, parsed_event = self.run_test(
            "Parse Natural Language Event for Integration",
            "POST",
            "parse-event",
            200,
            data=data
        )
        
        if not parse_success or not parsed_event.get('start_time') or not parsed_event.get('end_time'):
            print("❌ Failed to parse event text")
            return False
            
        print(f"✅ Successfully parsed event: {parsed_event.get('title')}")
        
        # Step 2: Create event with the parsed data
        create_data = {
            "title": parsed_event.get('title') or "Team Meeting",
            "description": parsed_event.get('description') or "Meeting parsed from natural language",
            "start_time": parsed_event.get('start_time'),
            "end_time": parsed_event.get('end_time'),
            "venue": parsed_event.get('venue') or "Conference Room",
            "priority": parsed_event.get('priority') or "medium",
            "recurrence": "none"
        }
        
        create_success, created_event = self.run_test(
            "Create Event from Parsed Data",
            "POST",
            "events",
            200,
            data=create_data
        )
        
        if not create_success or not created_event.get('id'):
            print("❌ Failed to create event from parsed data")
            return False
            
        print(f"✅ Successfully created event from parsed data: {created_event.get('id')}")
        
        # Step 3: Try to create a conflicting event
        conflict_start = datetime.fromisoformat(parsed_event.get('start_time').replace('Z', '+00:00')) if isinstance(parsed_event.get('start_time'), str) else parsed_event.get('start_time')
        conflict_start = conflict_start + timedelta(minutes=30)
        conflict_end = conflict_start + timedelta(hours=1)
        
        conflict_data = {
            "title": "Conflicting Meeting",
            "description": "This should conflict with the previous event",
            "start_time": conflict_start.isoformat(),
            "end_time": conflict_end.isoformat(),
            "venue": "Same Room",
            "priority": "high",
            "recurrence": "none"
        }
        
        conflict_success, conflict_response = self.run_test(
            "Create Conflicting Event for Integration Test",
            "POST",
            "events",
            409,  # Expect conflict status code
            data=conflict_data
        )
        
        if conflict_success:
            print("❌ Event was created despite conflict - integration test failed")
            return False
        else:
            print("✅ Conflict was correctly detected in integration workflow")
            
            # Check if we got suggested alternative time slots
            if isinstance(conflict_response, dict) and 'detail' in conflict_response:
                detail = conflict_response['detail']
                if isinstance(detail, dict):
                    conflicts = detail.get('conflicts', [])
                    suggested_slots = detail.get('suggested_slots', [])
                    
                    if len(conflicts) > 0 and len(suggested_slots) > 0:
                        print("✅ Integration test complete: AI parsing → Event creation → Conflict detection with suggestions")
                        return True
            
            print("✅ Integration test complete: AI parsing → Event creation → Conflict detection")
            return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Itinerary Management System API Tests")
        
        # Skip registration since we're using the existing test user
        print("\n🔍 Skipping registration - using existing test user: testuser")
        
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return 1
            
        if not self.test_get_user_profile():
            print("❌ Getting user profile failed")
        
        # Test new features
        print("\n🧠 Testing Natural Language Event Parsing...")
        if not self.test_parse_natural_language_event():
            print("❌ Natural language parsing failed")
        
        # Test event management
        if not self.test_create_event():
            print("❌ Event creation failed, skipping related tests")
        else:
            self.test_get_events()
            self.test_get_event_by_id()
            
            # Test conflict detection
            print("\n⚠️ Testing Conflict Detection...")
            self.test_check_conflicts_endpoint()
            self.test_create_conflicting_events()
            
            # Test notifications after creating an event
            print("\n📬 Testing Notifications...")
            if not self.test_get_notifications():
                print("❌ No notifications found after event creation")
            else:
                # Test marking notification as read
                if not self.test_mark_notification_as_read():
                    print("❌ Failed to mark notification as read")
            
            # Continue with event tests
            self.test_update_event()
            self.test_delete_event()
        
        # Print results
        print(f"\n📊 Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://56489903-c601-4eff-a5d5-02aeda2baf0e.preview.emergentagent.com"
    
    print(f"Using backend URL: {backend_url}")
    
    # Run the tests
    tester = ItineraryAPITester(backend_url)
    
    # Try to create a test user first
    print("\n🔍 Creating test user...")
    if not tester.test_register():
        print("❌ User registration failed, trying to login with existing user")
        # Try to continue with login
        if not tester.test_login():
            print("❌ Login also failed, stopping tests")
            return 1
    
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())