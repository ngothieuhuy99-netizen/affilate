// Thay thế bằng Google Apps Script Web App URL của bạn sau khi deploy
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxtskvOfmPZvlcqoiVTjYXatzbTelGF3Gn0jQ9gQ0Dm5DX888BcpqyCBWB04xoSeUEHoA/exec";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch Config (Zalo link) when page loads
    fetchConfig();

    // 2. Handle File Upload UI
    const fileInput = document.getElementById("cvFile");
    const uploadArea = document.getElementById("uploadFileArea");
    const fileNameDisplay = document.getElementById("fileNameDisplay");

    // Drag & Drop effects
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
    });

    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files; // Assign files to input
            updateFileName(files[0]);
        }
    });

    fileInput.addEventListener('change', function () {
        if (this.files.length > 0) {
            updateFileName(this.files[0]);
        }
    });

    function updateFileName(file) {
        // Validate file size (e.g. 5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showFeedback("File quá lớn. Vui lòng chọn file dưới 5MB.", "error");
            fileInput.value = "";
            fileNameDisplay.textContent = "Kéo thả hoặc Nhấp để chọn CV (*)";
            return;
        }
        fileNameDisplay.textContent = file.name;
    }

    // 3. Handle Form Submit
    const form = document.getElementById("recruitment-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!fileInput.files.length) {
            showFeedback("Vui lòng đính kèm CV.", "error");
            return;
        }

        const file = fileInput.files[0];
        setLoading(true);

        try {
            // Convert file to Base64
            const base64Data = await getBase64(file);
            // Extract just the base64 string without the data URL prefix
            const base64Content = base64Data.split(',')[1];

            const formData = {
                fullName: document.getElementById("fullName").value,
                email: document.getElementById("email").value,
                phone: document.getElementById("phone").value,
                position: document.getElementById("position").value,
                message: document.getElementById("message").value,
                fileName: file.name,
                fileMimeType: file.type || 'application/octet-stream',
                fileBase64: base64Content
            };

            if (GAS_API_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
                showFeedback("LỖI: Chưa cấu hình GAS_API_URL trong app.js", "error");
                setLoading(false);
                return;
            }

            // Send to Google Apps Script
            const response = await fetch(GAS_API_URL, {
                method: "POST",
                // GAS cross-origin issues are avoided by using text/plain or handling CORS correctly in GAS.
                // We use standard JSON stringify and text/plain to avoid preflight issues sometimes, 
                // but application/json is handled by our doOptions/CORS headers in GAS.
                // Depending on GAS behavior, form submissions might prefer text/plain.
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.status === "success") {
                showFeedback("Gửi hồ sơ thành công! Đang chuyển hướng...", "success");
                form.reset();
                fileNameDisplay.textContent = "Kéo thả hoặc Nhấp để chọn CV (*)";

                // Trả các input có label nổi về trạng thái rỗng
                document.querySelectorAll('.input-wrapper input, .input-wrapper textarea').forEach(input => {
                    input.blur();
                });

                // Chuyển hướng sau khi nộp
                const redirectUrl = localStorage.getItem("companyUrl") || "https://google.com";
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 2000);
            } else {
                showFeedback("Có lỗi xảy ra: " + result.message, "error");
            }
        } catch (error) {
            console.error("Submit Error:", error);
            showFeedback("Lỗi kết nối. Vui lòng thử lại sau.", "error");
        } finally {
            setLoading(false);
        }
    });
});

// Fetch config from Google Sheet
async function fetchConfig() {
    if (GAS_API_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
        console.warn("Chưa cấu hình GAS_API_URL.");
        return;
    }
    try {
        const response = await fetch(GAS_API_URL);
        const result = await response.json();

        if (result.status === "success") {
            if (result.data.zalo) {
                const zaloWidget = document.getElementById("zaloWidget");
                zaloWidget.href = result.data.zalo;
                zaloWidget.style.opacity = "1"; // Show the widget
            }
            // Save company URL for redirection later
            if (result.data.url) {
                localStorage.setItem("companyUrl", result.data.url);
            }
        }
    } catch (e) {
        console.error("Lỗi khi tải cấu hình:", e);
    }
}

// Convert File to Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Form UI Helpers
function setLoading(isLoading) {
    const btn = document.getElementById("submitBtn");
    const text = btn.querySelector(".btn-text");
    const loader = btn.querySelector(".loader");

    if (isLoading) {
        btn.disabled = true;
        text.classList.add("hidden");
        loader.classList.remove("hidden");
    } else {
        btn.disabled = false;
        text.classList.remove("hidden");
        loader.classList.add("hidden");
    }
}

function showFeedback(msg, type) {
    const feedback = document.getElementById("formMessage");
    feedback.textContent = msg;
    feedback.className = "form-feedback " + type;
}
