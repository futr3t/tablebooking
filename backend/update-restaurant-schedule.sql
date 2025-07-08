-- Update restaurant schedule to be closed on Mondays for testing
UPDATE restaurants 
SET opening_hours = '{
    "monday": {"isOpen": false},
    "tuesday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
    "wednesday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
    "thursday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
    "friday": {"isOpen": true, "openTime": "11:00", "closeTime": "23:00"},
    "saturday": {"isOpen": true, "openTime": "11:00", "closeTime": "23:00"},
    "sunday": {"isOpen": true, "openTime": "12:00", "closeTime": "21:00"}
}'
WHERE id = 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6g';