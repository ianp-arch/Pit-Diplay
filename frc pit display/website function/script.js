
const dashboard = document.querySelector(".dashboard");
const panels = [...document.querySelectorAll(".dashboard .panel")];

const STORAGE_KEY = "team1796DashboardLayoutV4";
const BATTERY_COUNT = 8;

let layoutReady = false;


// CLOCK

function updateClock() {
    const now = new Date();

    document.getElementById("clock").textContent =
        now.toLocaleTimeString("en-US");

    document.getElementById("date").textContent =
        now.toLocaleDateString("en-US");
}


// DASHBOARD HEIGHT

function updateDashboardHeight() {
    const lowestPoint = Math.max(
        700,
        ...panels.map(panel => panel.offsetTop + panel.offsetHeight + 30)
    );

    dashboard.style.minHeight = `${lowestPoint}px`;
}


// DEFAULT LAYOUT

function setDefaultLayout() {
    const gap = 20;
    const width = dashboard.clientWidth;
    const columns = width >= 1100 ? 3 : width >= 650 ? 2 : 1;
    const panelWidth = (width - gap * (columns + 1)) / columns;

    panels.forEach((panel, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);

        panel.style.left = `${gap + column * (panelWidth + gap)}px`;
        panel.style.top = `${gap + row * 340}px`;
        panel.style.width = `${panelWidth}px`;
        panel.style.height = panel.classList.contains("diagnostics")
            ? "300px"
            : "200px";
    });

    updateDashboardHeight();
}


// SAVE LAYOUT

function saveLayout() {
    if (!layoutReady) return;

    const layout = panels.map(panel => ({
        x: parseFloat(panel.style.left) || 0,
        y: parseFloat(panel.style.top) || 0,
        width: panel.offsetWidth,
        height: panel.offsetHeight
    }));

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
        console.error("Layout could not be saved:", error);
    }

    updateDashboardHeight();
}


// LOAD LAYOUT

function loadLayout() {
    let savedLayout = null;

    try {
        savedLayout = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
        console.error("Could not load saved layout:", error);
    }

    const validLayout =
        Array.isArray(savedLayout) &&
        savedLayout.length === panels.length &&
        savedLayout.every(position =>
            position &&
            Number.isFinite(position.x) &&
            Number.isFinite(position.y) &&
            Number.isFinite(position.width) &&
            Number.isFinite(position.height) &&
            position.width >= 200 &&
            position.height >= 140
        );

    if (!validLayout) {
        setDefaultLayout();
    } else {
        panels.forEach((panel, index) => {
            const position = savedLayout[index];

            panel.style.left = `${position.x}px`;
            panel.style.top = `${position.y}px`;
            panel.style.width = `${position.width}px`;
            panel.style.height = `${position.height}px`;
        });
    }

    updateDashboardHeight();
}


// DRAG PANELS

panels.forEach(panel => {
    const heading = panel.querySelector("h2");

    if (!heading) return;

    heading.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;

        event.preventDefault();

        const startX = event.clientX;
        const startY = event.clientY;

        const originalX = parseFloat(panel.style.left) || 0;
        const originalY = parseFloat(panel.style.top) || 0;

        panel.classList.add("dragging");

        function move(moveEvent) {
            panel.style.left =
                `${Math.max(0, originalX + moveEvent.clientX - startX)}px`;

            panel.style.top =
                `${Math.max(0, originalY + moveEvent.clientY - startY)}px`;
        }

        function stop() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
            window.removeEventListener("pointercancel", stop);

            panel.classList.remove("dragging");

            saveLayout();
        }

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", stop);
    });
});


// RESET DASHBOARD

document.getElementById("reset-layout").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
});


// BATTERY CART

function createBatteryCards() {
    const grid = document.getElementById("battery-cart-grid");

    for (let i = 1; i <= BATTERY_COUNT; i++) {
        grid.innerHTML += `
            <div class="battery-card">
                <h3>BATTERY ${i}</h3>

                <label>Voltage (V)</label>
                <input type="number" id="voltage-${i}" step="0.1"
                    placeholder="Enter voltage">

                <label>Condition</label>
                <select id="condition-${i}">
                    <option value="Good">Good</option>
                    <option value="Check">Check</option>
                    <option value="Bad">Bad</option>
                </select>

                <button onclick="updateBattery(${i})">UPDATE</button>

                <p id="battery-result-${i}">Not entered</p>
            </div>
        `;
    }
}


function updateBattery(number) {
    const voltage = document.getElementById(`voltage-${number}`).value;
    const condition = document.getElementById(`condition-${number}`).value;
    const result = document.getElementById(`battery-result-${number}`);

    if (
        voltage === "" ||
        !Number.isFinite(Number(voltage)) ||
        Number(voltage) <= 0
    ) {
        alert("Please enter a valid battery voltage.");
        return;
    }

    result.textContent =
        `${Number(voltage).toFixed(2)} V - ${condition}`;

    result.style.color = {
        Good: "#2FBF2F",
        Check: "#FFD700",
        Bad: "#FF4444"
    }[condition];

    localStorage.setItem(`battery-${number}`, JSON.stringify({
        voltage,
        condition
    }));
}


function loadBatteries() {
    for (let i = 1; i <= BATTERY_COUNT; i++) {
        const saved = localStorage.getItem(`battery-${i}`);

        if (!saved) continue;

        try {
            const battery = JSON.parse(saved);

            if (
                !battery ||
                typeof battery.voltage !== "string" ||
                !["Good", "Check", "Bad"].includes(battery.condition) ||
                !Number.isFinite(Number(battery.voltage)) ||
                Number(battery.voltage) <= 0
            ) continue;

            document.getElementById(`voltage-${i}`).value =
                battery.voltage;

            document.getElementById(`condition-${i}`).value =
                battery.condition;

            updateBattery(i);
        } catch {
            localStorage.removeItem(`battery-${i}`);
        }
    }
}


// START DASHBOARD

function startDashboard() {
    updateClock();
    setInterval(updateClock, 1000);

    createBatteryCards();
    loadBatteries();

    loadLayout();

    layoutReady = true;

    saveLayout();

    panels.forEach(panel => {
        new ResizeObserver(() => {
            saveLayout();
        }).observe(panel);
    });

    console.log("TEAM 1796 DASHBOARD LOADED SUCCESSFULLY");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startDashboard);
} else {
    startDashboard();
}

