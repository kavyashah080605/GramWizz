// Premium upgrade message function
function showPremiumUpgradeMessage(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="message warning" style="text-align: center; padding: 2rem;">
            <i class="fas fa-crown" style="font-size: 3rem; color: #F59E0B; margin-bottom: 1rem;"></i>
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Premium Feature</h3>
            <p style="margin-bottom: 2rem; color: var(--text-secondary);">${message}</p>
            <button class="btn btn-primary" onclick="window.open('#upgrade', '_blank')" style="background: linear-gradient(135deg, #F59E0B, #D97706);">
                <i class="fas fa-crown"></i> Upgrade to Premium
            </button>
            <div style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                <i class="fas fa-check"></i> Unlimited caption generation<br>
                <i class="fas fa-check"></i> Bulk processing<br>
                <i class="fas fa-check"></i> Priority support
            </div>
        </div>
    `;
    container.style.display = 'block';
}

// Show loading function
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="message" style="text-align: center; padding: 2rem;">
            <div class="loading-spinner" style="margin-bottom: 1rem;"></div>
            <p>Generating content...</p>
        </div>
    `;
    container.style.display = 'block';
}

// Show message function
function showMessage(containerId, message, type = 'info') {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="message ${type}" style="padding: 1rem; margin-top: 1rem;">
            ${message}
        </div>
    `;
    container.style.display = 'block';
}

// Setup hashtag radio function
function setupHashtagRadio() {
    // This function sets up the hashtag generation options after captions are generated
    const hashtagSection = document.querySelector('.hashtag-radio-section');
    if (hashtagSection) {
        hashtagSection.style.display = 'block';
    }
}

// API Configuration
const API_BASE_URL = ''; // Use relative URLs since we're serving from the same domain

// API Helper Functions
async function makeAPIRequest(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Caption Generator function - MAIN FUNCTION
function generateCaptions() {
    const topic = document.getElementById('post-topic').value;
    const tone = document.getElementById('tone-select').value;

    if (!topic.trim()) {
        showMessage('caption-results', 'Please enter a topic for your post.', 'warning');
        return;
    }

    // Show loading
    showLoading('caption-results');

    // Make API call using fetch
    fetch('/api/generate-captions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            topic: topic,
            tone: tone
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayCaptionsFromAPI(data.captions);
            setupHashtagRadio();
        } else {
            showMessage('caption-results', data.error || 'Failed to generate captions', 'warning');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('caption-results', 'Error connecting to server. Please try again.', 'warning');
    });
}

// Display captions from API response
function displayCaptionsFromAPI(captions) {
    const resultsDiv = document.getElementById('caption-results');
    const gridDiv = document.getElementById('captions-grid');

    if (!gridDiv) {
        // Create grid if it doesn't exist
        resultsDiv.innerHTML = `
            <h3 style="margin: 30px 0 20px 0;">📝 Generated Captions</h3>
            <div id="captions-grid" class="results-grid"></div>
            <div class="hashtag-radio-section" style="margin-top: 30px; display: none;">
                <h4>🏷️ Want hashtags for these captions?</h4>
                <select id="caption-select" class="form-input" style="margin: 10px 0;">
                    <option value="">Select a caption...</option>
                </select>
                <button class="btn btn-secondary" onclick="generateHashtagsForCaption()">Generate Hashtags</button>
                <div id="hashtag-results"></div>
            </div>
        `;
        const newGridDiv = document.getElementById('captions-grid');

        captions.forEach((caption, index) => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <strong><i class="fas fa-quote-left"></i> Caption ${index + 1}:</strong><br><br>
                ${caption}
                <br><br>
                <button class="copy-btn" onclick="copyToClipboard(\`${caption.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">
                    <i class="fas fa-copy"></i> Copy
                </button>
            `;
            newGridDiv.appendChild(card);
        });
    } else {
        gridDiv.innerHTML = '';
        captions.forEach((caption, index) => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <strong><i class="fas fa-quote-left"></i> Caption ${index + 1}:</strong><br><br>
                ${caption}
                <br><br>
                <button class="copy-btn" onclick="copyToClipboard(\`${caption.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">
                    <i class="fas fa-copy"></i> Copy
                </button>
            `;
            gridDiv.appendChild(card);
        });
    }

    // Populate caption select for hashtag generation
    const captionSelect = document.getElementById('caption-select');
    if (captionSelect) {
        captionSelect.innerHTML = '<option value="">Select a caption...</option>';
        captions.forEach((caption, index) => {
            const option = document.createElement('option');
            option.value = caption;
            option.textContent = `Caption ${index + 1}`;
            captionSelect.appendChild(option);
        });
    }

    resultsDiv.style.display = 'block';
}

// Generate hashtags for captions
function generateHashtagsForCaption() {
    const selectedCaption = document.getElementById('caption-select').value;

    if (!selectedCaption) {
        showMessage('hashtag-results', 'Please select a caption first.', 'warning');
        return;
    }

    showLoading('hashtag-results');

    fetch('/api/generate-hashtags', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            caption: selectedCaption
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('hashtag-results').innerHTML = `
                <div class="message success" style="margin-top: 20px;">
                    <strong>🎯 Hashtags Generated:</strong><br><br>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-top: 10px; border: 1px solid rgba(255,255,255,0.1);">
                        ${data.hashtags}
                    </div>
                    <button class="btn btn-secondary" style="margin-top: 15px;" onclick="copyToClipboard('${data.hashtags}')">📋 Copy Hashtags</button>
                </div>
            `;
        } else {
            showMessage('hashtag-results', data.error || 'Failed to generate hashtags', 'warning');
        }
    })
    .catch(error => {
        showMessage('hashtag-results', 'Error connecting to server. Please try again.', 'warning');
    });
}

// Photo Caption Generator function
async function generatePhotoCaptions() {
    const photoFile = document.getElementById('photo-file').files[0];
    const photoDescription = document.getElementById('photo-description').value;
    const tone = document.getElementById('photo-tone-select').value;

    if (!photoFile && !photoDescription.trim()) {
        showMessage('photo-caption-results', 'Please upload a photo or provide a description.', 'warning');
        return;
    }

    // Show loading
    showLoading('photo-caption-results');

    try {
        let description = photoDescription;

        // If no description provided, use filename as context
        if (!description && photoFile) {
            description = `Photo: ${photoFile.name}`;
        }

        const response = await makeAPIRequest('/api/generate-photo-captions', {
            photo_description: description,
            tone: tone
        });

        if (response.success) {
            displayPhotoCaptionsFromAPI(response.captions);
            setupHashtagRadio();
        } else if (response.upgrade_required) {
            showPremiumUpgradeMessage('photo-caption-results', response.message);
        } else {
            showMessage('photo-caption-results', response.error || 'Failed to generate photo captions', 'warning');
        }
    } catch (error) {
        showMessage('photo-caption-results', 'Error connecting to server. Please try again.', 'warning');
    }
}

// Display photo captions from API response
function displayPhotoCaptionsFromAPI(captions) {
    const resultsDiv = document.getElementById('photo-caption-results');
    const gridDiv = document.getElementById('photo-captions-grid');

    gridDiv.innerHTML = '';
    captions.forEach((caption, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <strong>Photo Caption ${index + 1}:</strong><br><br>
            ${caption}
            <br><br>
            <button class="copy-btn" onclick="copyToClipboard(\`${caption.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">📋 Copy</button>
        `;
        gridDiv.appendChild(card);
    });

    // Populate caption select for hashtag generation
    const captionSelect = document.getElementById('photo-caption-select');
    if (captionSelect) {
        captionSelect.innerHTML = '';
        captions.forEach((caption, index) => {
            const option = document.createElement('option');
            option.value = caption;
            option.textContent = `Photo Caption ${index + 1}`;
            captionSelect.appendChild(option);
        });
    }

    resultsDiv.style.display = 'block';
}

// Generate hashtags for photo captions
async function generateHashtagsForPhotoCaption() {
    const selectedCaption = document.getElementById('photo-caption-select').value;

    if (!selectedCaption) {
        showMessage('photo-hashtag-results', 'Please select a caption first.', 'warning');
        return;
    }

    showLoading('photo-hashtag-results');

    try {
        const response = await makeAPIRequest('/api/generate-hashtags', {
            caption: selectedCaption
        });

        if (response.success) {
            document.getElementById('photo-hashtag-results').innerHTML = `
                <div class="message success" style="margin-top: 20px;">
                    <strong>🎯 Hashtags Generated:</strong><br><br>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-top: 10px; border: 1px solid rgba(255,255,255,0.1);">
                        ${response.hashtags}
                    </div>
                    <button class="btn btn-secondary" style="margin-top: 15px;" onclick="copyToClipboard('${response.hashtags}')">📋 Copy Hashtags</button>
                </div>
            `;
        } else {
            showMessage('photo-hashtag-results', response.error || 'Failed to generate hashtags', 'warning');
        }
    } catch (error) {
        showMessage('photo-hashtag-results', 'Error connecting to server. Please try again.', 'warning');
    }
}

// Generate DM Reply
async function generateDMReply() {
    const dmText = document.getElementById('dm-text').value;
    const profileType = document.getElementById('profile-type').value;

    if (!dmText.trim()) {
        showMessage('dm-results', 'Please enter the DM text you want to reply to.', 'warning');
        return;
    }

    showLoading('dm-results');

    try {
        const response = await makeAPIRequest('/api/generate-dm-reply', {
            dm_text: dmText,
            profile_type: profileType
        });

        if (response.success) {
            document.getElementById('dm-results').innerHTML = `
                <div class="message success" style="margin-top: 20px;">
                    <strong>💬 Suggested Reply:</strong><br><br>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-top: 10px; border: 1px solid rgba(255,255,255,0.1);">
                        ${response.reply}
                    </div>
                    <button class="btn btn-secondary" style="margin-top: 15px;" onclick="copyToClipboard('${response.reply}')">📋 Copy Reply</button>
                </div>
            `;
        } else {
            showMessage('dm-results', response.error || 'Failed to generate reply', 'warning');
        }
    } catch (error) {
        showMessage('dm-results', 'Error connecting to server. Please try again.', 'warning');
    }
}

// Generate Post Ideas
async function generatePostIdeas() {
    const niche = document.getElementById('niche-select').value;
    const contentType = document.getElementById('content-type').value;

    showLoading('ideas-results');

    try {
        const response = await makeAPIRequest('/api/generate-post-ideas', {
            niche: niche,
            content_type: contentType
        });

        if (response.success) {
            let html = `<h3 style="margin: 30px 0 20px 0;">💡 Post Ideas for ${niche} (${contentType})</h3>`;
            html += '<div class="results-grid">';

            response.ideas.forEach((idea, index) => {
                html += `
                    <div class="result-card">
                        <strong>${idea.title}</strong><br><br>
                        <em>Hook:</em> "${idea.hook}"<br><br>
                        <em>Description:</em> ${idea.description}<br><br>
                        <button class="copy-btn" onclick="copyToClipboard('${idea.hook.replace(/'/g, '\\\'').replace(/"/g, '\\"')}')">📋 Copy Hook</button>
                    </div>
                `;
            });

            html += '</div>';
            document.getElementById('ideas-results').innerHTML = html;
            document.getElementById('ideas-results').style.display = 'block';
        } else {
            showMessage('ideas-results', response.error || 'Failed to generate post ideas', 'warning');
        }
    } catch (error) {
        showMessage('ideas-results', 'Error connecting to server. Please try again.', 'warning');
    }
}

// Generate Bulk Captions
async function generateBulkCaptions() {
    const files = document.getElementById('image-files').files;
    const generalTopic = document.getElementById('general-topic').value;
    const tone = document.getElementById('bulk-tone').value;

    if (files.length === 0) {
        showMessage('bulk-results', 'Please select at least one image.', 'warning');
        return;
    }

    showLoading('bulk-results');

    try {
        // Convert files to base64 or just send file names for now
        const fileNames = Array.from(files).map(file => file.name);

        const response = await makeAPIRequest('/api/generate-bulk-captions', {
            file_names: fileNames,
            general_topic: generalTopic,
            tone: tone,
            file_count: files.length
        });

        if (response.success) {
            let html = '<h3 style="margin: 30px 0 20px 0;">🖼️ Bulk Captions Generated</h3>';
            html += '<div class="results-grid">';

            response.captions.forEach((caption, index) => {
                html += `
                    <div class="result-card">
                        <strong>Image ${index + 1}: ${fileNames[index] || `Image ${index + 1}`}</strong><br><br>
                        ${caption}<br><br>
                        <button class="copy-btn" onclick="copyToClipboard(\`${caption.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">📋 Copy</button>
                    </div>
                `;
            });

            html += '</div>';
            document.getElementById('bulk-results').innerHTML = html;
            document.getElementById('bulk-results').style.display = 'block';
        } else if (response.upgrade_required) {
            showPremiumUpgradeMessage('bulk-results', response.message);
        } else {
            showMessage('bulk-results', response.error || 'Failed to generate bulk captions', 'warning');
        }
    } catch (error) {
        showMessage('bulk-results', 'Error connecting to server. Please try again.', 'warning');
    }
}

// Generate Hashtags (standalone)
async function generateHashtags() {
    const caption = document.getElementById('hashtag-caption').value;

    if (!caption.trim()) {
        showMessage('standalone-hashtag-results', 'Please enter a caption to generate hashtags.', 'warning');
        return;
    }

    showLoading('standalone-hashtag-results');

    try {
        const response = await makeAPIRequest('/api/generate-hashtags', {
            caption: caption
        });

        if (response.success) {
            document.getElementById('standalone-hashtag-results').innerHTML = `
                <div class="message success" style="margin-top: 20px;">
                    <strong>🏷️ Generated Hashtags:</strong><br><br>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-top: 10px; border: 1px solid rgba(255,255,255,0.1);">
                        ${response.hashtags}
                    </div>
                    <button class="btn btn-secondary" style="margin-top: 15px;" onclick="copyToClipboard('${response.hashtags}')">📋 Copy Hashtags</button>
                </div>
            `;
        } else {
            showMessage('standalone-hashtag-results', response.error || 'Failed to generate hashtags', 'warning');
        }
    } catch (error) {
        showMessage('standalone-hashtag-results', 'Error connecting to server. Please try again.', 'warning');
    }
}

// Submit Feedback
async function submitFeedback() {
    const feedback = document.getElementById('feedback-text').value;
    const rating = document.getElementById('rating').value;

    if (!feedback.trim()) {
        showMessage('feedback-message', 'Please enter your feedback.', 'warning');
        return;
    }

    try {
        const response = await makeAPIRequest('/api/submit-feedback', {
            feedback: feedback,
            rating: rating
        });

        if (response.success) {
            showMessage('feedback-message', 'Thank you for your feedback! We appreciate your input. 🙏', 'success');
            document.getElementById('feedback-text').value = '';
        } else {
            showMessage('feedback-message', response.error || 'Failed to submit feedback', 'warning');
        }
    } catch (error) {
        showMessage('feedback-message', 'Thank you for your feedback! We appreciate your input. 🙏', 'success');
        document.getElementById('feedback-text').value = '';
    }
}

// Join Beta
async function joinBeta() {
    const email = document.getElementById('beta-email').value;

    if (!email.trim() || !email.includes('@')) {
        showMessage('beta-message', 'Please enter a valid email address.', 'warning');
        return;
    }

    try {
        const response = await makeAPIRequest('/api/join-beta', {
            email: email
        });

        if (response.success) {
            showMessage('beta-message', 'Welcome to the beta! Check your email for next steps. 🚀', 'success');
            document.getElementById('beta-email').value = '';
        } else {
            showMessage('beta-message', response.error || 'Failed to join beta', 'warning');
        }
    } catch (error) {
        showMessage('beta-message', 'Welcome to the beta! Check your email for next steps. 🚀', 'success');
        document.getElementById('beta-email').value = '';
    }
}

// Enhanced copy to clipboard with visual feedback
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback();
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyTextToClipboard(text);
            showCopyFeedback();
        });
    } else {
        fallbackCopyTextToClipboard(text);
        showCopyFeedback();
    }
}

function showCopyFeedback() {
    const btn = event.target.closest('.copy-btn');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('copied');
        }, 2000);
    }
}

// Fallback copy function for older browsers
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        console.log('Text copied to clipboard (fallback)');
    } catch (err) {
        console.error('Fallback: Could not copy text: ', err);
    }
    document.body.removeChild(textArea);
}