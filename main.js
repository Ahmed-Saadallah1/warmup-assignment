const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    // Parse start time
    const startParts = startTime.trim().split(' ');
    const startTimePart = startParts[0];
    const startPeriod = startParts[1].toLowerCase();
    
    const [startHours, startMinutes, startSeconds] = startTimePart.split(':').map(Number);
    
    // Convert to 24-hour format
    let start24Hours = startHours;
    if (startPeriod === 'am' && startHours === 12) {
        start24Hours = 0;
    } else if (startPeriod === 'pm' && startHours !== 12) {
        start24Hours = startHours + 12;
    }
    
    const startTotalSeconds = start24Hours * 3600 + startMinutes * 60 + startSeconds;
    
    // Parse end time
    const endParts = endTime.trim().split(' ');
    const endTimePart = endParts[0];
    const endPeriod = endParts[1].toLowerCase();
    
    const [endHours, endMinutes, endSeconds] = endTimePart.split(':').map(Number);
    
    // Convert to 24-hour format
    let end24Hours = endHours;
    if (endPeriod === 'am' && endHours === 12) {
        end24Hours = 0;
    } else if (endPeriod === 'pm' && endHours !== 12) {
        end24Hours = endHours + 12;
    }
    
    const endTotalSeconds = end24Hours * 3600 + endMinutes * 60 + endSeconds;
    
    // Calculate duration in seconds
    let durationSeconds = endTotalSeconds - startTotalSeconds;
    
    // If duration is negative, shift spans midnight
    if (durationSeconds < 0) {
        durationSeconds += 24 * 3600;
    }
    
    // Convert back to h:mm:ss format
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;
    
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    // Helper: convert "hh:mm:ss am/pm" to total seconds from midnight
    function toSeconds(timeStr) {
        const parts = timeStr.trim().split(' ');
        const timePart = parts[0];
        const period = parts[1].toLowerCase();
        let [hours, minutes, seconds] = timePart.split(':').map(Number);
        if (period === 'am' && hours === 12) {
            hours = 0;
        } else if (period === 'pm' && hours !== 12) {
            hours += 12;
        }
        return hours * 3600 + minutes * 60 + seconds;
    }
    const start = toSeconds(startTime);
    let end = toSeconds(endTime);
    // Handle shifts that cross midnight
    if (end < start) {
        end += 24 * 3600;
    }
    const daySeconds = 24 * 3600;
    const deliveryStart = 8 * 3600;   // 8:00:00 AM
    const deliveryEnd = 22 * 3600;    // 10:00:00 PM
    let idleTimeSeconds = 0;
    // Check overlap with idle ranges for each day the shift touches
    for (let dayOffset = 0; dayOffset <= end; dayOffset += daySeconds) {
        // Idle before 8 AM
        const idle1Start = dayOffset;
        const idle1End = dayOffset + deliveryStart;
        // Idle after 10 PM
        const idle2Start = dayOffset + deliveryEnd;
        const idle2End = dayOffset + daySeconds;
        // Overlap with first idle range
        const overlap1 = Math.max(0, Math.min(end, idle1End) - Math.max(start, idle1Start));
        // Overlap with second idle range
        const overlap2 = Math.max(0, Math.min(end, idle2End) - Math.max(start, idle2Start));
        idleTimeSeconds += overlap1 + overlap2;
    }
    const hours = Math.floor(idleTimeSeconds / 3600);
    const minutes = Math.floor((idleTimeSeconds % 3600) / 60);
    const seconds = idleTimeSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    // Helper: convert "h:mm:ss" to total seconds
    function toSeconds(timeStr) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    // Helper: convert seconds back to "h:mm:ss" format
    function toTimeFormat(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    const shiftDurationSeconds = toSeconds(shiftDuration);
    const idleTimeSeconds = toSeconds(idleTime);
    
    // Active time = shift duration - idle time
    const activeTimeSeconds = shiftDurationSeconds - idleTimeSeconds;
    
    return toTimeFormat(activeTimeSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // Helper: convert "h:mm:ss" to total seconds
    function toSeconds(timeStr) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    // Parse the date
    const [year, month, day] = date.split('-').map(Number);
    
    // Check if date falls within Eid al-Fitr special period (April 10-30, 2025)
    let quotaSeconds;
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        // Special period: 6 hours
        quotaSeconds = 6 * 3600; // 6:00:00
    } else {
        // Normal period: 8 hours and 24 minutes
        quotaSeconds = 8 * 3600 + 24 * 60; // 8:24:00
    }
    
    // Convert active time to seconds
    const activeTimeSeconds = toSeconds(activeTime);
    
    // Return true if active time meets or exceeds quota
    return activeTimeSeconds >= quotaSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const metQuotaResult = metQuota(shiftObj.date, activeTime);
    const hasBonus = false;

    const completeRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuotaResult,
        hasBonus: hasBonus
    };

    const headers = "DriverID,DriverName,Date,StartTime,EndTime,ShiftDuration,IdleTime,ActiveTime,MetQuota,HasBonus";
    let records = [];

    try {
        if (fs.existsSync(textFile)) {
            const fileContent = fs.readFileSync(textFile, "utf8").trim();

            if (fileContent !== "") {
                const lines = fileContent.split(/\r?\n/);
                records = lines.slice(1);
            }
        }
    } catch (error) {
        return {};
    }

    // Check for duplicate entry
    for (let record of records) {
        const parts = record.split(",");
        if (
            parts[0] === shiftObj.driverID &&
            parts[2] === shiftObj.date &&
            parts[3] === shiftObj.startTime &&
            parts[4] === shiftObj.endTime
        ) {
            return {};
        }
    }

    const newRecordLine =
        `${completeRecord.driverID},${completeRecord.driverName},${completeRecord.date},${completeRecord.startTime},${completeRecord.endTime},${completeRecord.shiftDuration},${completeRecord.idleTime},${completeRecord.activeTime},${completeRecord.metQuota},${completeRecord.hasBonus}`;

    // Find last occurrence of same driverID
    let insertIndex = -1;
    for (let i = records.length - 1; i >= 0; i--) {
        const parts = records[i].split(",");
        if (parts[0] === shiftObj.driverID) {
            insertIndex = i;
            break;
        }
    }

    if (insertIndex === -1) {
        // DriverID not found → append at end
        records.push(newRecordLine);
    } else {
        // Insert after last record of this driverID
        records.splice(insertIndex + 1, 0, newRecordLine);
    }

    try {
        const newContent = headers + "\n" + records.join("\n");
        fs.writeFileSync(textFile, newContent, "utf8");
        return completeRecord;
    } catch (error) {
        return {};
    }
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    try {
        if (!fs.existsSync(textFile)) {
            return;
        }
        
        const fileContent = fs.readFileSync(textFile, "utf8").trim();
        if (fileContent === "") {
            return;
        }
        
        const lines = fileContent.split(/\r?\n/);
        const headers = lines[0];
        const records = lines.slice(1);
        
        // Find and update matching record(s)
        let found = false;
        const updatedRecords = records.map((record) => {
            const parts = record.split(",");
            if (parts[0] === driverID && parts[2] === date) {
                found = true;
                // Update the hasBonus field (last column, index 9)
                parts[9] = newValue;
            }
            return parts.join(",");
        });
        
        // Write back to file
        if (found) {
            const newContent = headers + "\n" + updatedRecords.join("\n");
            fs.writeFileSync(textFile, newContent, "utf8");
        }
    } catch (error) {
        return;
    }
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    try {
        if (!fs.existsSync(textFile)) {
            return -1;
        }
        
        const fileContent = fs.readFileSync(textFile, "utf8").trim();
        if (fileContent === "") {
            return -1;
        }
        
        const lines = fileContent.split(/\r?\n/);
        const records = lines.slice(1);
        
        // Normalize month format (ensure it's 2 digits)
        const normalizedMonth = String(month).padStart(2, '0');
        
        let driverFound = false;
        let bonusCount = 0;
        
        for (let record of records) {
            const parts = record.split(",");
            const recordDriverID = parts[0];
            const recordDate = parts[2]; // Format: yyyy-mm-dd
            const recordHasBonus = parts[9]; // hasBonus field
            
            if (recordDriverID === driverID) {
                driverFound = true;
                
                // Extract month from date (yyyy-mm-dd)
                const recordMonth = recordDate.split("-")[1];
                
                // Check if month matches and hasBonus is true
                if (recordMonth === normalizedMonth && recordHasBonus === "true") {
                    bonusCount++;
                }
            }
        }
        
        // Return -1 if driver not found, otherwise return bonus count
        if (!driverFound) {
            return -1;
        }
        
        return bonusCount;
    } catch (error) {
        return -1;
    }
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // Helper: convert "h:mm:ss" to total seconds
    function toSeconds(timeStr) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    // Helper: convert seconds back to "hhh:mm:ss" format
    function toTimeFormat(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    try {
        if (!fs.existsSync(textFile)) {
            return "0:00:00";
        }
        
        const fileContent = fs.readFileSync(textFile, "utf8").trim();
        if (fileContent === "") {
            return "0:00:00";
        }
        
        const lines = fileContent.split(/\r?\n/);
        const records = lines.slice(1);
        
        // Normalize month to 2 digits
        const normalizedMonth = String(month).padStart(2, '0');
        
        let totalActiveSeconds = 0;
        
        for (let record of records) {
            const parts = record.split(",");
            const recordDriverID = parts[0];
            const recordDate = parts[2]; // Format: yyyy-mm-dd
            const recordActiveTime = parts[7]; // activeTime field
            
            if (recordDriverID === driverID) {
                // Extract month from date (yyyy-mm-dd)
                const recordMonth = recordDate.split("-")[1];
                
                // Check if month matches
                if (recordMonth === normalizedMonth) {
                    totalActiveSeconds += toSeconds(recordActiveTime);
                }
            }
        }
        
        return toTimeFormat(totalActiveSeconds);
    } catch (error) {
        return "0:00:00";
    }
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================

function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    function toTimeFormat(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function normalizeDayName(dayName) {
        const value = String(dayName).trim().toLowerCase();
        const dayMap = {
            sunday: "sunday",
            sun: "sunday",
            monday: "monday",
            mon: "monday",
            tuesday: "tuesday",
            tue: "tuesday",
            tues: "tuesday",
            wednesday: "wednesday",
            wed: "wednesday",
            thursday: "thursday",
            thu: "thursday",
            thur: "thursday",
            thurs: "thursday",
            friday: "friday",
            fri: "friday",
            saturday: "saturday",
            sat: "saturday"
        };
        return dayMap[value] || null;
    }

    function getDriverDayOff(rateLines, targetDriverID) {
        for (const line of rateLines) {
            const parts = line.split(",").map(part => part.trim());
            if (parts.length === 0 || parts[0] !== targetDriverID) {
                continue;
            }

            for (let i = 1; i < parts.length; i++) {
                const day = normalizeDayName(parts[i]);
                if (day !== null) {
                    return day;
                }
            }
        }
        return null;
    }

    try {
        if (!fs.existsSync(textFile) || !fs.existsSync(rateFile)) {
            return "0:00:00";
        }

        const textContent = fs.readFileSync(textFile, "utf8").trim();
        const rateContent = fs.readFileSync(rateFile, "utf8").trim();

        if (textContent === "" || rateContent === "") {
            return "0:00:00";
        }

        const rateLines = rateContent.split(/\r?\n/).filter(line => line.trim() !== "");
        const textLines = textContent.split(/\r?\n/).filter(line => line.trim() !== "");

        const driverDayOff = getDriverDayOff(rateLines, driverID);
        if (driverDayOff === null) {
            return "0:00:00";
        }

        const normalizedMonth = String(month).padStart(2, "0");
        const weekDays = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday"
        ];

        const normalQuotaSeconds = 8 * 3600 + 24 * 60; // 8:24:00
        const eidQuotaSeconds = 6 * 3600; // 6:00:00

        let totalRequiredSeconds = 0;
        const processedDates = new Set();

        // Skip header row
        for (let i = 1; i < textLines.length; i++) {
            const parts = textLines[i].split(",").map(part => part.trim());

            if (parts.length < 3) {
                continue;
            }

            const recordDriverID = parts[0];
            const recordDate = parts[2];

            if (recordDriverID !== driverID) {
                continue;
            }

            const dateParts = recordDate.split("-");
            if (dateParts.length !== 3) {
                continue;
            }

            const year = parseInt(dateParts[0], 10);
            const recordMonth = dateParts[1];
            const day = parseInt(dateParts[2], 10);

            if (Number.isNaN(year) || Number.isNaN(day)) {
                continue;
            }

            if (recordMonth !== normalizedMonth) {
                continue;
            }

            // Count each date only once
            if (processedDates.has(recordDate)) {
                continue;
            }
            processedDates.add(recordDate);

            const dateObj = new Date(year, parseInt(recordMonth, 10) - 1, day);
            const weekdayName = weekDays[dateObj.getDay()];

            // Do not add required hours if the driver worked on their day off
            if (weekdayName === driverDayOff) {
                continue;
            }

            // Eid period: April 10–30, 2025
            if (year === 2025 && parseInt(recordMonth, 10) === 4 && day >= 10 && day <= 30) {
                totalRequiredSeconds += eidQuotaSeconds;
            } else {
                totalRequiredSeconds += normalQuotaSeconds;
            }
        }

        const validBonusCount = Number.isFinite(bonusCount) ? bonusCount : 0;
        totalRequiredSeconds -= validBonusCount * 2 * 3600;

        if (totalRequiredSeconds < 0) {
            totalRequiredSeconds = 0;
        }

        return toTimeFormat(totalRequiredSeconds);
    } catch (error) {
        return "0:00:00";
    }
}
// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================

function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    function toSeconds(timeStr) {
        const parts = String(timeStr).split(":");
        if (parts.length !== 3) {
            return 0;
        }

        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);

        if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
            return 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    function toFullHours(totalSeconds) {
        return Math.floor(totalSeconds / 3600);
    }

    try {
        if (!fs.existsSync(rateFile)) {
            return 0;
        }

        const rateContent = fs.readFileSync(rateFile, "utf8").trim();
        if (rateContent === "") {
            return 0;
        }

        const rateLines = rateContent.split(/\r?\n/).filter(line => line.trim() !== "");
        let basePay = null;
        let tier = null;

        for (const line of rateLines) {
            const parts = line.split(",").map(part => part.trim());

            if (parts[0] === driverID) {
                basePay = parseInt(parts[2], 10);
                tier = parseInt(parts[3], 10);
                break;
            }
        }

        if (
            basePay === null ||
            tier === null ||
            Number.isNaN(basePay) ||
            Number.isNaN(tier)
        ) {
            return 0;
        }

        const actualSeconds = toSeconds(actualHours);
        const requiredSeconds = toSeconds(requiredHours);

        let missingSeconds = requiredSeconds - actualSeconds;
        if (missingSeconds < 0) {
            missingSeconds = 0;
        }

        const tierAllowances = {
            1: 50 * 3600,
            2: 20 * 3600,
            3: 10 * 3600,
            4: 3 * 3600
        };

        const allowedMissingSeconds = tierAllowances[tier] || 0;

        let billableMissingSeconds = missingSeconds - allowedMissingSeconds;
        if (billableMissingSeconds < 0) {
            billableMissingSeconds = 0;
        }

        const billableMissingHours = toFullHours(billableMissingSeconds);
        const deductionRatePerHour = Math.floor(basePay / 185);
        const salaryDeduction = billableMissingHours * deductionRatePerHour;
        const netPay = basePay - salaryDeduction;

        return netPay;
    } catch (error) {
        return 0;
    }
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
