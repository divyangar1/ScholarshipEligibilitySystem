
"use strict";

// ============================================================
// SCHOLARPATH - COMPLETE FRONTEND JAVASCRIPT
// ============================================================

console.log("ScholarPath JavaScript loaded.");

let loggedInStudent = null;
let allScholarships = [];
let eligibleScholarships = [];
let recommendedScholarships = [];

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupLogin();
    setupRegistration();
    setupProfile();
    setupEligibility();
    setupRecommendations();
    setupDeadlines();
    setupScholarshipSearch();
    loadScholarships();
});

// ============================================================
// API HELPER
// ============================================================

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers
        }
    });

    const text = await response.text();
    let data;

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            "The server returned an invalid response. Check the Java server and API endpoint."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", event => {
            const id = link.getAttribute("href");
            const target = id
                ? document.querySelector(id)
                : null;

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            document.querySelectorAll(".nav-link")
                .forEach(nav => nav.classList.remove("active"));

            if (link.classList.contains("nav-link")) {
                link.classList.add("active");
            }
        });
    });
}

// ============================================================
// LOGIN
// ============================================================

function setupLogin() {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const email = document
            .getElementById("loginEmail")
            .value.trim();

        const password = document
            .getElementById("loginPassword")
            .value;

        const message = document.getElementById("loginMessage");

        if (!email || !password) {
            showMessage(
                message,
                "Enter your email and password.",
                "error"
            );
            return;
        }

        try {
            showMessage(message, "Logging in...", "info");

            const data = await apiRequest("/api/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            if (data.success === false) {
                throw new Error(data.message || "Login failed.");
            }

            const student = data.student || data;

            loggedInStudent = {
                ...student,
                studentId: student.studentId || data.studentId,
                name: student.name || data.name || "Student",
                email: student.email || data.email || email
            };

            if (!loggedInStudent.studentId) {
                throw new Error(
                    "The login response did not contain a student ID."
                );
            }

            localStorage.setItem(
                "loggedInStudent",
                JSON.stringify(loggedInStudent)
            );

            updateNavbarName();

            showMessage(
                message,
                "Login successful! Welcome " +
                    loggedInStudent.name + ".",
                "success"
            );

            await loadProfile(loggedInStudent.studentId);
            await loadScholarships();

            scrollToSection("profile-area");

        } catch (error) {
            console.error("Login error:", error);
            showMessage(message, error.message, "error");
        }
    });
}

// ============================================================
// REGISTRATION
// ============================================================

function setupRegistration() {
    const section = document.getElementById("registration");

    if (!section) return;

    const button = section.querySelector("button.large-button");

    if (button) {
        button.addEventListener("click", showRegistrationForm);
    }
}

function showRegistrationForm() {
    document.getElementById("registrationModal")?.remove();

    const modal = document.createElement("div");
    modal.id = "registrationModal";

    const fields = [
        ["name", "Full Name", "text"],
        ["registerNumber", "Register Number", "text"],
        ["department", "Department", "text"],
        ["year", "Year of Study", "number"],
        ["email", "Email Address", "email"],
        ["mobile", "Mobile Number", "tel"],
        ["password", "Password", "password"],
        ["age", "Age", "number"],
        ["gender", "Gender", "select", ["MALE", "FEMALE", "OTHER"]],
        ["cgpa", "CGPA", "number"],
        ["class12Percentage", "Class 12 Percentage", "number"],
        ["course", "Course", "text"],
        ["institutionType", "Institution Type", "text"],
        ["institutionName", "Institution Name", "text"],
        ["state", "State", "text"],
        ["familyIncome", "Annual Family Income", "number"],
        ["category", "Category", "select", ["OC", "BC", "MBC", "SC", "ST"]],
        ["firstGraduate", "First Graduate", "select", ["false", "true"]],
        ["disability", "Person with Disability", "select", ["false", "true"]]
    ];

    const formFields = fields.map(
        ([name, label, type, options]) => {
            let input;

            if (type === "select") {
                input = `
                    <select id="reg-${name}" required>
                        <option value="">Select ${escapeHtml(label)}</option>
                        ${options.map(option => `
                            <option value="${escapeHtml(option)}">
                                ${
                                    option === "true" ? "Yes" :
                                    option === "false" ? "No" :
                                    escapeHtml(option)
                                }
                            </option>
                        `).join("")}
                    </select>
                `;
            } else {
                let extra = "";

                if (name === "cgpa") {
                    extra = 'min="0" max="10" step="0.01"';
                } else if (name === "class12Percentage") {
                    extra = 'min="0" max="100" step="0.01"';
                } else if (name === "year") {
                    extra = 'min="1" max="4"';
                } else if (name === "age") {
                    extra = 'min="1" max="100"';
                } else if (name === "familyIncome") {
                    extra = 'min="0" step="0.01"';
                }

                input = `
                    <input
                        id="reg-${name}"
                        type="${type}"
                        ${extra}
                        placeholder="Enter ${escapeHtml(label.toLowerCase())}"
                        required>
                `;
            }

            return `
                <div class="form-group">
                    <label for="reg-${name}">
                        ${escapeHtml(label)}
                    </label>
                    ${input}
                </div>
            `;
        }
    ).join("");

    modal.innerHTML = `
        <div class="registration-overlay">
            <div class="registration-modal">
                <button type="button"
                        class="registration-close"
                        id="closeRegistration"
                        aria-label="Close registration">×</button>

                <h2>Create Your ScholarPath Account</h2>
                <p>Enter your student information below.</p>

                <form id="registrationForm">
                    <div class="registration-grid">
                        ${formFields}
                    </div>

                    <p id="registrationMessage"></p>

                    <button type="submit"
                            class="large-button green-large">
                        Create Account
                    </button>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeRegistration")
        .addEventListener("click", () => modal.remove());

    modal.querySelector(".registration-overlay")
        .addEventListener("click", event => {
            if (event.target === event.currentTarget) {
                modal.remove();
            }
        });

    document.getElementById("registrationForm")
        .addEventListener("submit", registerStudent);
}

async function registerStudent(event) {
    event.preventDefault();

    const message = document.getElementById("registrationMessage");

    const value = name => {
        const input = document.getElementById("reg-" + name);
        return input ? input.value.trim() : "";
    };

    const studentData = {
        name: value("name"),
        registerNumber: value("registerNumber"),
        department: value("department"),
        year: Number(value("year")),
        email: value("email"),
        mobile: value("mobile"),
        password: value("password"),
        age: Number(value("age")),
        gender: value("gender"),
        cgpa: Number(value("cgpa")),
        class12Percentage: Number(value("class12Percentage")),
        course: value("course"),
        institutionType: value("institutionType"),
        institutionName: value("institutionName"),
        state: value("state"),
        familyIncome: Number(value("familyIncome")),
        category: value("category"),
        firstGraduate: value("firstGraduate") === "true",
        disability: value("disability") === "true"
    };

    try {
        showMessage(message, "Creating your account...", "info");

        const data = await apiRequest("/api/register", {
            method: "POST",
            body: JSON.stringify(studentData)
        });

        if (data.success === false) {
            throw new Error(data.message || "Registration failed.");
        }

        const student = data.student || data;
        const studentId = student.studentId || data.studentId;

        document.getElementById("registrationModal")?.remove();

        if (studentId) {
            loggedInStudent = {
                ...student,
                studentId,
                name: student.name || studentData.name,
                email: student.email || studentData.email
            };

            localStorage.setItem(
                "loggedInStudent",
                JSON.stringify(loggedInStudent)
            );

            updateNavbarName();
            await loadProfile(studentId);
            scrollToSection("profile-area");
        } else {
            showSimpleAlert(
                "Registration completed. Please log in to continue."
            );
            scrollToSection("login");
        }

    } catch (error) {
        console.error("Registration error:", error);
        showMessage(message, error.message, "error");
    }
}

// ============================================================
// PROFILE
// ============================================================

function setupProfile() {
    const saved = localStorage.getItem("loggedInStudent");

    if (!saved) return;

    try {
        loggedInStudent = JSON.parse(saved);
        updateNavbarName();

        if (loggedInStudent.studentId) {
            loadProfile(loggedInStudent.studentId);
        }
    } catch (error) {
        console.error("Unable to restore login:", error);
        localStorage.removeItem("loggedInStudent");
    }
}

async function loadProfile(studentId) {
    if (!studentId) return false;

    try {
        const data = await apiRequest(
            "/api/profile?studentId=" +
            encodeURIComponent(studentId)
        );

        if (data.success === false) {
            throw new Error(data.message || "Unable to load profile.");
        }

        const student = data.student || data.profile || data;

        loggedInStudent = {
            ...(loggedInStudent || {}),
            ...student,
            studentId: student.studentId || studentId
        };

        localStorage.setItem(
            "loggedInStudent",
            JSON.stringify(loggedInStudent)
        );

        displayProfile(student);
        updateNavbarName();

        return true;

    } catch (error) {
        console.error("Profile loading error:", error);

        const loading = document.getElementById("profile-loading-message");
        if (loading) {
            loading.textContent = error.message;
        }

        return false;
    }
}

function displayProfile(student) {
    const section = document.getElementById("profile-area");

    if (!section || !student) return;

    const name = section.querySelector(".profile-name");

    if (name) {
        name.textContent = student.name || "Student";
    }

    const fields = [
        "studentId",
        "name",
        "registerNumber",
        "department",
        "year",
        "email",
        "mobile",
        "age",
        "gender",
        "cgpa",
        "class12Percentage",
        "course",
        "institutionType",
        "institutionName",
        "state",
        "familyIncome",
        "category",
        "firstGraduate",
        "disability"
    ];

    fields.forEach(key => {
        const element = section.querySelector(
            `[data-profile="${key}"]`
        );

        if (!element) return;

        let value = student[key];

        if (
            key === "familyIncome" &&
            value !== null &&
            value !== undefined &&
            value !== ""
        ) {
            value = formatCurrency(value);
        } else if (
            key === "cgpa" &&
            value !== null &&
            value !== undefined &&
            value !== ""
        ) {
            value = Number(value).toFixed(2);
        } else if (
            key === "class12Percentage" &&
            value !== null &&
            value !== undefined &&
            value !== ""
        ) {
            value = value + "%";
        } else if (typeof value === "boolean") {
            value = value ? "Yes" : "No";
        }

        element.textContent =
            value === null || value === undefined || value === ""
                ? "Not Available"
                : String(value);
    });

    const loading = document.getElementById("profile-loading-message");

    if (loading) {
        loading.textContent = "";
    }
}

function updateNavbarName() {
    const element = document.querySelector(".navbar-student-name");

    if (element && loggedInStudent) {
        element.textContent = loggedInStudent.name || "Student";
    }
}

// ============================================================
// SCHOLARSHIP EXPLORER
// ============================================================

async function loadScholarships() {
    const container = document.getElementById("scholarshipContainer");

    if (!container) return;

    container.innerHTML = "<p>Loading scholarships...</p>";

    try {
        const data = await apiRequest("/api/scholarships");

        let scholarships = Array.isArray(data)
            ? data
            : data.scholarships || data.data || [];

        if (!Array.isArray(scholarships)) {
            scholarships = [];
        }

        allScholarships = scholarships;

        renderScholarships(allScholarships, "scholarshipContainer");

    } catch (error) {
        console.error("Scholarship loading error:", error);

        container.innerHTML = `
            <div class="info-box">
                <h3>Unable to Load Scholarships</h3>
                <p>${escapeHtml(error.message)}</p>
                <p>Check that the Java server is running.</p>
                <button type="button"
                        class="large-button"
                        id="retryScholarships">
                    Try Again
                </button>
            </div>
        `;

        document.getElementById("retryScholarships")
            ?.addEventListener("click", loadScholarships);
    }
}

// ============================================================
// SHARED SCHOLARSHIP CARDS
// Used by Explorer, Eligibility and Recommendations
// ============================================================

function renderScholarships(scholarships, containerId) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }

    if (!Array.isArray(scholarships) || scholarships.length === 0) {
        container.innerHTML = `
            <div class="info-box">
                <h3>No Scholarships Found</h3>
                <p>No scholarship records are currently available.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = scholarships
        .map((scholarship, index) =>
            createScholarshipCard(scholarship, index)
        )
        .join("");

    // Delegated click handler: works for every card and View Details button.
    container.onclick = event => {
        const card = event.target.closest("[data-scholarship-index]");

        if (!card || !container.contains(card)) return;

        // Do not intercept official website links.
        if (event.target.closest("a")) return;

        const index = Number(card.dataset.scholarshipIndex);
        const scholarship = scholarships[index];

        if (scholarship) {
            showScholarshipModal(scholarship);
        }
    };

    // Keyboard support for clickable cards.
    container.onkeydown = event => {
        if (event.target.closest("button")) return;

        const card = event.target.closest("[data-scholarship-index]");

        if (
            card &&
            (event.key === "Enter" || event.key === " ")
        ) {
            event.preventDefault();

            const index = Number(card.dataset.scholarshipIndex);
            const scholarship = scholarships[index];

            if (scholarship) {
                showScholarshipModal(scholarship);
            }
        }
    };
}

function createScholarshipCard(scholarship, index) {
    const name = getScholarshipValue(
        scholarship,
        ["scholarshipName", "name", "title"],
        "Scholarship"
    );

    const id = getScholarshipValue(
        scholarship,
        ["scholarshipId", "id"],
        "Not Available"
    );

    const provider = getScholarshipValue(
        scholarship,
        ["provider", "providerName"],
        "Not Available"
    );

    const type = getScholarshipValue(
        scholarship,
        ["providerType", "type"],
        "Scholarship"
    );

    const status = getScholarshipValue(
        scholarship,
        ["applicationStatus", "status"],
        "Check Details"
    );

    const benefit = getScholarshipValue(
        scholarship,
        ["benefitAmount", "amount", "awardAmount"],
        ""
    );

    return `
        <div class="scholarship-card"
             data-scholarship-index="${index}"
             role="button"
             tabindex="0"
             aria-label="View details for ${escapeHtml(name)}">

            <div class="scholarship-card-top">
                <span class="scholarship-type">
                    ${escapeHtml(type)}
                </span>
                <span class="scholarship-status">
                    ${escapeHtml(status)}
                </span>
            </div>

            <h3>${escapeHtml(name)}</h3>

            <p class="scholarship-provider">
                🏛️ ${escapeHtml(provider)}
            </p>

            <p>
                <strong>Scholarship ID:</strong>
                ${escapeHtml(id)}
            </p>

            <div class="scholarship-benefit">
                <span>💰 Benefit</span>
                <strong>
                    ${
                        benefit
                            ? escapeHtml(formatCurrency(benefit))
                            : "See Details"
                    }
                </strong>
            </div>

            <button type="button"
                    class="large-button scholarship-details-button">
                View Details →
            </button>
        </div>
    `;
}

// ============================================================
// SCHOLARSHIP DETAILS MODAL
// ============================================================

function showScholarshipModal(scholarship) {
    if (!scholarship) return;

    document.getElementById("scholarshipModal")?.remove();

    const modal = document.createElement("div");
    modal.id = "scholarshipModal";

    const details = [
        ["Scholarship ID", ["scholarshipId", "id"]],
        ["Provider", ["provider", "providerName"]],
        ["Provider Type", ["providerType", "type"]],
        ["Academic Year", ["academicYear", "year"]],
        ["Application Status", ["applicationStatus", "status"]],
        ["Application Start", ["applicationStart", "startDate"]],
        ["Benefit Amount", ["benefitAmount", "amount", "awardAmount"]],
        ["Eligibility Requirements", [
            "eligibilitySummary",
            "eligibilityDetails",
            "eligibility",
            "eligibilityCriteria"
        ]],
        ["Minimum CGPA", ["minCGPA", "minCgpa", "minimumCgpa"]],
        ["Maximum Family Income", [
            "maxFamilyIncome",
            "maxIncome",
            "maximumIncome"
        ]],
        ["Application Deadline", [
            "applicationDeadline",
            "deadline",
            "lastDate"
        ]],
        ["Official Source", [
            "officialProviderUrl",
            "officialSource",
            "sourceUrl"
        ]],
        ["Source Type", ["sourceType"]],
        ["Last Verified", ["lastVerified"]]
    ];

    const detailHTML = details.map(([label, keys]) => {
        const value = getScholarshipValue(scholarship, keys, "");

        if (!value) return "";

        const formatted =
            label === "Benefit Amount" ||
            label === "Maximum Family Income"
                ? formatCurrency(value)
                : value;

        return `
            <p>
                <strong>${escapeHtml(label)}:</strong>
                ${escapeHtml(formatted)}
            </p>
        `;
    }).join("");

    const officialUrl = getScholarshipValue(
        scholarship,
        ["officialProviderUrl", "officialSource", "sourceUrl"],
        ""
    );

    let officialLink = "";

    if (/^https?:\/\//i.test(officialUrl)) {
        officialLink = `
            <p>
                <a href="${escapeHtml(officialUrl)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="large-button">
                    🌐 Visit Official Website
                </a>
            </p>
        `;
    }

    const scholarshipName = getScholarshipValue(
        scholarship,
        ["scholarshipName", "name", "title"],
        "Scholarship Details"
    );

    modal.innerHTML = `
        <div class="registration-overlay">
            <div class="registration-modal scholarship-modal"
                 role="dialog"
                 aria-modal="true"
                 aria-label="Scholarship details">

                <button type="button"
                        class="registration-close"
                        id="closeScholarshipModal"
                        aria-label="Close details">
                    ×
                </button>

                <h2>${escapeHtml(scholarshipName)}</h2>

                <div class="info-box">
                    ${
                        detailHTML ||
                        "<p>Additional details are not available.</p>"
                    }
                </div>

                ${officialLink}

                <button type="button"
                        class="large-button"
                        id="closeScholarshipDetails">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    function closeModal() {
        modal.remove();
        document.removeEventListener("keydown", escapeKey);
    }

    function escapeKey(event) {
        if (event.key === "Escape") {
            closeModal();
        }
    }

    document.getElementById("closeScholarshipModal")
        .addEventListener("click", closeModal);

    document.getElementById("closeScholarshipDetails")
        .addEventListener("click", closeModal);

    modal.querySelector(".registration-overlay")
        .addEventListener("click", event => {
            if (event.target === event.currentTarget) {
                closeModal();
            }
        });

    document.addEventListener("keydown", escapeKey);
}

// ============================================================
// SCHOLARSHIP SEARCH
// ============================================================

function setupScholarshipSearch() {
    const input = document.getElementById("scholarshipSearch");

    if (!input) return;

    input.addEventListener("input", () => {
        const term = input.value.trim().toLowerCase();

        const filtered = allScholarships.filter(scholarship => {
            const text = Object.values(scholarship)
                .filter(value =>
                    value !== null &&
                    value !== undefined &&
                    typeof value !== "object"
                )
                .join(" ")
                .toLowerCase();

            return text.includes(term);
        });

        renderScholarships(filtered, "scholarshipContainer");
    });
}

// ============================================================
// ELIGIBILITY
// ============================================================

function setupEligibility() {
    const section = document.getElementById("eligibility-area");

    if (!section) return;

    let button = section.querySelector("[data-action='eligibility']");

    if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "large-button";
        button.textContent = "Check My Eligibility →";
        button.dataset.action = "eligibility";

        const results = document.getElementById("eligibilityResults");

        if (results) {
            section.insertBefore(button, results);
        } else {
            section.appendChild(button);
        }
    }

    button.addEventListener("click", checkEligibility);
}

async function checkEligibility() {
    if (!loggedInStudent?.studentId) {
        showSimpleAlert("Please log in first to check your eligibility.");
        scrollToSection("login");
        return;
    }

    const container = document.getElementById("eligibilityResults");

    if (container) {
        container.innerHTML = "<p>Checking your eligibility...</p>";
    }

    try {
        const data = await apiRequest("/api/eligibility", {
            method: "POST",
            body: JSON.stringify({
                studentId: loggedInStudent.studentId
            })
        });

        if (data.success === false) {
            throw new Error(data.message || "Eligibility check failed.");
        }

        eligibleScholarships =
            data.eligibleScholarships ||
            data.scholarships ||
            data.results ||
            [];

        if (!Array.isArray(eligibleScholarships)) {
            eligibleScholarships = [];
        }

        eligibleScholarships.forEach(scholarship => {
            const id = getScholarshipValue(
                scholarship,
                ["scholarshipId", "id"],
                ""
            );

            const exists = allScholarships.some(item =>
                getScholarshipValue(
                    item,
                    ["scholarshipId", "id"],
                    ""
                ) === id
            );

            if (!exists) {
                allScholarships.push(scholarship);
            }
        });

        displayEligibilityResults(eligibleScholarships);

    } catch (error) {
        console.error("Eligibility error:", error);

        if (container) {
            container.innerHTML = `
                <div class="info-box">
                    <h3>Eligibility Check Failed</h3>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }
}

function displayEligibilityResults(scholarships) {
    const container = document.getElementById("eligibilityResults");

    if (!container) return;

    if (scholarships.length === 0) {
        container.innerHTML = `
            <div class="info-box">
                <h3>🎯 No Eligible Scholarships Found</h3>
                <p>No matching scholarships were returned for your profile.</p>
                <button type="button"
                        class="large-button"
                        id="browseAllScholarships">
                    Browse All Scholarships
                </button>
            </div>
        `;

        document.getElementById("browseAllScholarships")
            ?.addEventListener("click", () => {
                scrollToSection("explorer-area");
            });

        return;
    }

    container.innerHTML = `
        <div class="info-box">
            <h3>🎯 Eligible Scholarships</h3>
            <p>
                Total Eligible Scholarships:
                <strong>${scholarships.length}</strong>
            </p>
            <p>Select View Details to review a scholarship.</p>
        </div>
        <div id="eligibleScholarshipCards"
             class="scholarship-container"></div>
    `;

    renderScholarships(
        scholarships,
        "eligibleScholarshipCards"
    );
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

function setupRecommendations() {
    const section = document.getElementById("recommendations");

    if (!section) return;

    let button = section.querySelector(
        "[data-action='recommendations']"
    );

    if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "large-button";
        button.textContent = "Get My Recommendations →";
        button.dataset.action = "recommendations";

        const results = document.getElementById("recommendationResults");

        if (results) {
            section.insertBefore(button, results);
        } else {
            section.appendChild(button);
        }
    }

    button.addEventListener("click", loadRecommendations);
}

async function loadRecommendations() {
    if (!loggedInStudent?.studentId) {
        showSimpleAlert("Please log in first to view recommendations.");
        scrollToSection("login");
        return;
    }

    const container = document.getElementById("recommendationResults");

    if (container) {
        container.innerHTML = "<p>Loading recommendations...</p>";
    }

    try {
        const data = await apiRequest(
            "/api/recommendations?studentId=" +
            encodeURIComponent(loggedInStudent.studentId)
        );

        if (data.success === false) {
            throw new Error(
                data.message || "Unable to load recommendations."
            );
        }

        recommendedScholarships =
            data.recommendations ||
            data.scholarships ||
            [];

        if (!Array.isArray(recommendedScholarships)) {
            recommendedScholarships = [];
        }

        if (!container) return;

        if (recommendedScholarships.length === 0) {
            container.innerHTML = `
                <div class="info-box">
                    <h3>No Recommendations Available</h3>
                    <p>No recommendations were returned for your profile.</p>
                </div>
            `;
        } else {
            renderScholarships(
                recommendedScholarships,
                "recommendationResults"
            );
        }

    } catch (error) {
        console.error("Recommendations error:", error);

        if (container) {
            container.innerHTML = `
                <div class="info-box">
                    <h3>Unable to Load Recommendations</h3>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }
}

// ============================================================
// DEADLINES
// ============================================================

function setupDeadlines() {
    const section = document.getElementById("deadlines");

    if (!section) return;

    let button = section.querySelector("[data-action='deadlines']");

    if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "large-button";
        button.textContent = "Load Scholarship Deadlines →";
        button.dataset.action = "deadlines";

        const results = document.getElementById("deadlineResults");

        if (results) {
            section.insertBefore(button, results);
        } else {
            section.appendChild(button);
        }
    }

    button.addEventListener("click", loadDeadlines);
}

async function loadDeadlines() {
    const container = document.getElementById("deadlineResults");

    if (!container) return;

    container.innerHTML = "<p>Loading deadlines...</p>";

    try {
        const data = await apiRequest("/api/deadlines");

        if (data.success === false) {
            throw new Error(
                data.message || "Unable to load deadlines."
            );
        }

        const deadlines =
            data.deadlines ||
            data.scholarships ||
            [];

        if (!Array.isArray(deadlines) || deadlines.length === 0) {
            container.innerHTML = `
                <div class="info-box">
                    <h3>No Deadline Information</h3>
                    <p>Deadline information is not currently available.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = deadlines.map(item => {
            const name = getScholarshipValue(
                item,
                ["scholarshipName", "name", "title"],
                "Scholarship"
            );

            const deadline = getScholarshipValue(
                item,
                ["applicationDeadline", "deadline", "lastDate"],
                "Not Available"
            );

            return `
                <div class="info-box">
                    <h3>${escapeHtml(name)}</h3>
                    <p>
                        <strong>Application Deadline:</strong>
                        ${escapeHtml(deadline)}
                    </p>
                    <button type="button"
                            class="large-button deadline-details-button">
                        View Details →
                    </button>
                </div>
            `;
        }).join("");

        // Connect every deadline View Details button.
        container.querySelectorAll(".deadline-details-button")
            .forEach((button, index) => {
                button.addEventListener("click", () => {
                    showScholarshipModal(deadlines[index]);
                });
            });

    } catch (error) {
        console.error("Deadline error:", error);

        container.innerHTML = `
            <div class="info-box">
                <h3>Unable to Load Deadlines</h3>
                <p>${escapeHtml(error.message)}</p>
                <button type="button"
                        class="large-button"
                        id="retryDeadlines">
                    Try Again
                </button>
            </div>
        `;

        document.getElementById("retryDeadlines")
            ?.addEventListener("click", loadDeadlines);
    }
}

// ============================================================
// LOGOUT
// ============================================================

function logoutStudent() {
    loggedInStudent = null;
    localStorage.removeItem("loggedInStudent");
    window.location.reload();
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function getScholarshipValue(object, keys, fallback = "") {
    if (!object) return fallback;

    for (const key of keys) {
        const value = object[key];

        if (
            value !== null &&
            value !== undefined &&
            value !== ""
        ) {
            return String(value);
        }
    }

    return fallback;
}

function showMessage(element, message, type = "info") {
    if (!element) return;

    element.textContent = message;
    element.className = "registration-message " + type;
}

function showSimpleAlert(message) {
    alert(message);
}

function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
        return "Not Available";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    return "₹" + number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

console.log("ScholarPath frontend initialized successfully.");