/**
 * @typedef {Object} SkillSet
 * @property {number} electrical - 電気・設備知識 (1-10)
 * @property {number} technical - 技術力 (1-10)
 * @property {number} onSiteJudgment - 現場判断力 (1-10)
 * @property {number} safetyManagement - 安全管理意識 (1-10)
 * @property {number} qualityAccuracy - 品質・正確性 (1-10)
 * @property {number} communication - コミュニケーション力 (1-10)
 * @property {number} leadership - リーダーシップ (1-10)
 * @property {number} adaptability - 応用力 (1-10)
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
 * @property {SkillSet} skills
 * @property {number} avgSkill
 * @property {string} [sfContactId] - Future Salesforce Contact ID
 */

/**
 * @typedef {Object} JobType
 * @property {string} id
 * @property {string} nameJa
 * @property {number} baseTimeHours
 * @property {number} requiredSkillTotal
 * @property {string[]} primarySkills
 * @property {string[]} defaultConditionIds
 * @property {number} minPersonnel
 * @property {number} maxPersonnel
 * @property {'haiku'|'sonnet'} aiComplexity
 * @property {string} [sfJobTypeId] - Future Salesforce ID
 */

/**
 * @typedef {Object} Condition
 * @property {string} id
 * @property {string} nameJa
 * @property {string} description
 * @property {number} timeMultiplier
 * @property {string[]} applicableJobTypes
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
 * @property {number} estimatedTimeHours
 * @property {number} requiredSkillTotal
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
 * @property {number} teamSkillTotal
 * @property {boolean} isStretch
 * @property {number} stretchMultiplier
 * @property {'hiace'|'yodogawa_vehicle'|'both'|'multiple_hiace'} vehicleArrangement
 * @property {string} aiRecommendation
 * @property {'ai_recommended'|'manual'|'ai_modified'} selectionMethod
 * @property {string} [calendarEventId]
 * @property {string} scheduledDeparture
 * @property {string} scheduledArrival
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
 * @property {Object} [skillAdjustments]
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

export {};
