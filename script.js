document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM elements
    const requestIdInput = document.getElementById('requestId');
    const datetimeInput = document.getElementById('datetimeInput');
    const locationInput = document.getElementById('locationInput');
    const fromEmailInput = document.getElementById('fromEmail');
    const attendeesInput = document.getElementById('attendeesInput');
    const subjectInput = document.getElementById('subjectInput');
    const emailContentInput = document.getElementById('emailContentInput');
    const scheduleButton = document.getElementById('scheduleButton');
    const resultJsonPreview = document.getElementById('resultJsonPreview'); // Renamed for preview
    const errorMessage = document.getElementById('errorMessage');
    const statusIndicator = document.getElementById('statusIndicator');
    const responseTimeDisplay = document.getElementById('responseTime');
    const meetingCardsContainer = document.getElementById('meetingCardsContainer');

    // Modal elements
    const jsonModal = document.getElementById('jsonModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const modalResultJson = document.getElementById('modalResultJson');
    const modalResponseTime = document.getElementById('modalResponseTime');


    // --- Helper Functions ---

    /**
     * Format current date/time for the Datetime input
     * Format: DD-MM-YYYYTHH:MM:SS
     */
    const formatCurrentDatetime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${day}-${month}-${year}T${hours}:${minutes}:${seconds}`;
    };

    /**
     * Generate a UUID v4
     */
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    /**
     * Update status indicator with visual feedback
     * @param {string} status - 'loading', 'success', 'error', or empty string
     */
    const updateStatus = (status) => {
        statusIndicator.className = `status-indicator ${status}`;
    };

    /**
     * Show loading state on button
     */
    const showLoadingButton = () => {
        scheduleButton.disabled = true;
        scheduleButton.innerHTML = `
            <div class="loading-dots">
                <div></div>
                <div></div>
                <div></div>
            </div>
            Scheduling...
        `;
    };

    /**
     * Reset button to default state
     */
    const resetButton = () => {
        scheduleButton.disabled = false;
        scheduleButton.innerHTML = '<span class="button-text">Schedule Meeting</span>';
    };

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    const showError = (message) => {
        errorMessage.textContent = `Error: ${message}`;
        errorMessage.style.display = 'block';
    };

    /**
     * Hide error message
     */
    const hideError = () => {
        errorMessage.style.display = 'none';
    };

    /**
     * Parse attendees from comma-separated string
     * @param {string} attendeesString - Comma-separated email addresses
     * @returns {Array} Array of attendee objects
     */
    const parseAttendees = (attendeesString) => {
        return attendeesString
            .split(',')
            .map(email => ({ email: email.trim() }))
            .filter(attendee => attendee.email); // Filter out empty emails
    };

    /**
     * Validate form inputs
     * @returns {Object} Validation result with isValid boolean and message
     */
    const validateForm = () => {
        const requiredFields = [
            { field: fromEmailInput, name: 'From Email' },
            { field: locationInput, name: 'Location' },
            { field: attendeesInput, name: 'Attendees' },
            { field: subjectInput, name: 'Subject' },
            { field: emailContentInput, name: 'Message' }
        ];

        for (const { field, name } of requiredFields) {
            if (!field.value.trim()) {
                return {
                    isValid: false,
                    message: `${name} is required`
                };
            }
        }

        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(fromEmailInput.value)) {
            return {
                isValid: false,
                message: 'Please enter a valid sender email address'
            };
        }

        // Validate at least one attendee with valid email
        const attendees = parseAttendees(attendeesInput.value);
        if (attendees.length === 0) {
            return {
                isValid: false,
                message: 'Please enter at least one attendee email address'
            };
        }

        // Validate attendee email formats
        for (const attendee of attendees) {
            if (!emailPattern.test(attendee.email)) {
                return {
                    isValid: false,
                    message: `Invalid attendee email: ${attendee.email}`
                };
            }
        }

        return { isValid: true };
    };

    /**
     * Creates and displays a meeting card.
     * @param {object} meetingDetails - The data object containing meeting info.
     */
    const displayMeetingCard = (meetingDetails) => {
        const { EventStart, EventEnd, Duration_mins, Subject, Location } = meetingDetails;

        // Clear "No meeting scheduled yet." message
        const noMeetingMessage = document.querySelector('.no-meeting-message');
        if (noMeetingMessage) {
            noMeetingMessage.remove();
        }

        const card = document.createElement('div');
        card.className = 'meeting-card';

        // Check if a slot was found
        if (EventStart && EventStart !== "No available slot found") {
            // Get the list of attendees from the output JSON's Attendees array (which is the enriched one)
            // Filter to find attendees specifically for THIS newly scheduled meeting
            const scheduledAttendees = meetingDetails.Attendees
                .filter(attendee => attendee.events.some(event => 
                    event.Summary === (Subject || 'Scheduled Meeting') && 
                    event.StartTime === EventStart && 
                    event.EndTime === EventEnd
                ))
                .map(attendee => attendee.email);

            card.innerHTML = `
                <h3>${Subject || 'Scheduled Meeting'}</h3>
                <p><span class="label">Time:</span> ${EventStart} - ${EventEnd}</p>
                <p><span class="label">Duration:</span> ${Duration_mins} minutes</p>
                <p><span class="label">Location:</span> ${Location || 'Not specified'}</p>
                <p><span class="label">Attendees:</span></p>
                <div class="attendee-list">
                    ${scheduledAttendees.map(email => `<small>${email}</small>`).join('<br>')}
                </div>
            `;
        } else {
            card.innerHTML = `
                <h3>Scheduling Failed for: ${Subject || 'Meeting'}</h3>
                <p style="color:red;">No available slot found within working hours for the next 7 weekdays.</p>
                <p><span class="label">Requested Duration:</span> ${Duration_mins || 'N/A'} minutes</p>
            `;
        }
        
        // Prepend the new card so the newest is at the top
        meetingCardsContainer.prepend(card);
    };

    /**
     * Opens the modal with the full JSON response.
     * @param {string} jsonString - The full JSON string to display.
     * @param {string} duration - The response time duration string.
     */
    const openModal = (jsonString, duration) => {
        modalResultJson.textContent = jsonString;
        modalResponseTime.textContent = `Response time: ${duration}`;
        jsonModal.classList.add('active'); // Add 'active' class to show modal
        document.body.style.overflow = 'hidden'; // Prevent body scrolling
    };

    /**
     * Closes the modal.
     */
    const closeModal = () => {
        jsonModal.classList.remove('active'); // Remove 'active' class to hide modal
        document.body.style.overflow = ''; // Re-enable body scrolling
    };


    /**
     * Main function to schedule meeting
     */
    const scheduleMeeting = async () => {
        hideError(); // Hide previous errors
        responseTimeDisplay.textContent = ''; // Clear previous response time

        // Validate form
        const validation = validateForm();
        if (!validation.isValid) {
            showError(validation.message);
            updateStatus('error');
            return;
        }

        // Show loading state
        updateStatus('loading');
        showLoadingButton();
        resultJsonPreview.textContent = 'Processing your request...'; // Update preview area

        const requestData = {
            Request_id: requestIdInput.value || generateUUID(),
            Datetime: datetimeInput.value,
            Location: locationInput.value,
            From: fromEmailInput.value,
            Attendees: parseAttendees(attendeesInput.value),
            Subject: subjectInput.value,
            EmailContent: emailContentInput.value
        };

        const startTime = performance.now(); // Start timer

        try {
            // IMPORTANT: Update this URL to your Flask app's actual IP and port
            const response = await fetch('http://134.199.205.194:5000/receive', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            const endTime = performance.now(); // End timer
            const duration = (endTime - startTime).toFixed(2); // Calculate duration
            responseTimeDisplay.textContent = `Response time: ${duration} ms`; // Update preview response time

            if (!response.ok) {
                const errorBody = await response.text();
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorBody);
                    errorMsg += `, Message: ${errorJson.message || JSON.stringify(errorJson)}`;
                } catch (e) {
                    errorMsg += `, Raw Response: ${errorBody}`;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            updateStatus('success');
            
            // Populate preview with a concise version (e.g., first few lines or a summary)
            const previewText = `Status: ${data.EventStart && data.EventStart !== "No available slot found" ? "Scheduled" : "No Slot Found"}\n` +
                               `Start: ${data.EventStart}\n` +
                               `End: ${data.EventEnd}\n` +
                               `Duration: ${data.Duration_mins} mins`;
            resultJsonPreview.textContent = previewText;

            // Prepare full JSON for modal
            const fullJsonString = JSON.stringify(data, null, 2);
            resultJsonPreview.dataset.fullJson = fullJsonString; // Store full JSON in a data attribute
            resultJsonPreview.dataset.responseTime = duration; // Store response time


            // Display the meeting card
            displayMeetingCard(data);

        } catch (error) {
            console.error('Error scheduling meeting:', error);
            updateStatus('error');
            showError(error.message);
            resultJsonPreview.textContent = 'Failed to schedule meeting. Click to see details.'; // Update preview on error
            resultJsonPreview.dataset.fullJson = JSON.stringify({ error: error.message }, null, 2); // Store error in full JSON
            resultJsonPreview.dataset.responseTime = duration; // Store response time even for error
        } finally {
            resetButton();
        }
    };

    // --- Initialization ---

    const initializeForm = () => {
        datetimeInput.value = formatCurrentDatetime();
        requestIdInput.value = generateUUID();
        updateStatus('');
        resultJsonPreview.textContent = 'Click "Schedule Meeting" to begin...'; // Initial text for preview
        resultJsonPreview.dataset.fullJson = ''; // Clear stored JSON
        resultJsonPreview.dataset.responseTime = ''; // Clear stored response time
    };

    // Event listeners
    scheduleButton.addEventListener('click', scheduleMeeting);

    // Event listener to open modal from preview area
    resultJsonPreview.addEventListener('click', () => {
        const fullJson = resultJsonPreview.dataset.fullJson;
        const respTime = resultJsonPreview.dataset.responseTime;
        if (fullJson) { // Only open if there's actual JSON data
            openModal(fullJson, respTime);
        }
    });

    // Event listeners to close modal
    closeModalButton.addEventListener('click', closeModal);
    jsonModal.addEventListener('click', (event) => {
        // Close if clicking on the background (not the modal content)
        if (event.target === jsonModal) {
            closeModal();
        }
    });
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && jsonModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Initialize form on page load
    initializeForm();

    // Optional: Auto-refresh datetime every minute
    setInterval(() => {
        if (!scheduleButton.disabled) { // Only update if not currently scheduling
            datetimeInput.value = formatCurrentDatetime();
        }
    }, 60000);
});