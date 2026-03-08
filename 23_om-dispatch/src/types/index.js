/**
 * @typedef {Object.<string, number>} ManpowerByJobType
 * Maps job type IDs to manpower values (0.5-1.2)
 */

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} nameJa
 * @property {string} nameEn
 * @property {'regular'|'freelancer'} employmentType
 * @property {boolean} hasVehicle
 * @property {boolean} needsGuidance
 * @property {string} color
 * @property {string} outlookEmail
 * @property {ManpowerByJobType} manpowerByJobType
 * @property {string} [sfContactId] - Future Salesforce Contact ID
 */

/**
 * @typedef {Object} JobType
 * @property {string} id
 * @property {string} nameJa
 * @property {number} baseTimeHours
 * @property {number} baseManpower
 * @property {string[]} defaultConditionIds
 * @property {number} minPersonnel
 * @property {number} maxPersonnel
 * @property {string} [sfJobTypeId] - Future Salesforce ID
 */

/**
 * @typedef {Object} Condition
 * @property {string} id
 * @property {string} nameJa
 * @property {string} description
 * @property {string} jobTypeId - Job type this condition applies to
 * @property {'additive'|'multiplicative'} adjustmentType
 * @property {number} adjustmentValue - Manpower adjustment value
 */

/**
 * @typedef {Object} Job
 * @property {string} id
 * @property {string} jobTypeId
 * @property {string} title
 * @property {'draft'|'estimated'|'dispatched'|'in_progress'|'completed'|'cancelled'} status
 * @property {string} locationName
 * @property {string} locationAddress
 * @property {number} [latitude]
 * @property {number} [longitude]
 * @property {number} estimatedTravelMinutes
 * @property {string[]} activeConditionIds
 * @property {string[]} [conditionIds]
 * @property {number} estimatedTimeHours
 * @property {number} requiredManpower
 * @property {string} [preferredDate]
 * @property {string} [scheduledStart]
 * @property {string} [scheduledEnd]
 * @property {boolean} multiDay
 * @property {string} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [sfJobId] - Future Salesforce ID
 */

/**
 * @typedef {Object} Assignment
 * @property {string} id
 * @property {string} jobId
 * @property {string[]} memberIds
 * @property {string} leadMemberId
 * @property {number} teamManpower
 * @property {number} requiredManpower
 * @property {boolean} isStretch
 * @property {number} stretchRatio
 * @property {'hiace'|'yodogawa_vehicle'|'both'|'multiple_hiace'} vehicleArrangement
 * @property {string} vehicleDetails
 * @property {string} aiRecommendation
 * @property {'ai_recommended'|'manual'|'ai_modified'} selectionMethod
 * @property {string} [calendarEventId]
 * @property {string} scheduledDeparture
 * @property {string} scheduledArrival
 * @property {string} [scheduledDate]
 * @property {string} createdAt
 * @property {string} [sfAssignmentId] - Future Salesforce ID
 */

/**
 * @typedef {Object} Feedback
 * @property {string} id
 * @property {string} assignmentId
 * @property {string} jobId
 * @property {number} actualTimeHours
 * @property {number} difficultyRating
 * @property {string} notes
 * @property {Object} [manpowerAdjustments]
 * @property {string} submittedBy
 * @property {string} createdAt
 */

/**
 * @typedef {Object} AppSettings
 * @property {Object} workingHours
 * @property {string} workingHours.start
 * @property {string} workingHours.end
 * @property {string} workingHours.extendedStart
 * @property {string} workingHours.extendedEnd
 * @property {string} earliestDeparture
 * @property {string} latestWorkStart
 * @property {Object} stretchMode
 * @property {boolean} stretchMode.enabled
 * @property {number} stretchMode.defaultMultiplier
 * @property {number} stretchMode.maxMultiplier
 * @property {Object} baseLocation
 * @property {string} baseLocation.name
 * @property {string} baseLocation.address
 * @property {number} baseLocation.latitude
 * @property {number} baseLocation.longitude
 * @property {number} hiaceCapacity
 */

/**
 * @typedef {Object} MultiDayPlan
 * @property {number} rank
 * @property {'single-day'|'multi-day'} planType
 * @property {number} totalDays
 * @property {number} score
 * @property {DaySchedule[]} daySchedules
 */

/**
 * @typedef {Object} DaySchedule
 * @property {string} date
 * @property {string} label
 * @property {Object[]} assignments
 */

export {};
