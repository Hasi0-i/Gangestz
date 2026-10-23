const mongoose = require('mongoose');
const config = require('../config');

// ==============================================================================
// MONGODB CONNECTION
// ==============================================================================

let dbConnectionPromise = null;

const connectdb = async () => {
    // Already connected
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // Connection already in progress
    if (dbConnectionPromise) {
        return dbConnectionPromise;
    }

    mongoose.set('strictQuery', false);

    const mongoUri = config.MONGODB_URI;

    if (!mongoUri || String(mongoUri).startsWith('PASTE_YOUR_')) {
        console.error('❌ MONGODB_URI is not configured.');
        return null;
    }

    dbConnectionPromise = mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000
    })
        .then(() => {
            console.log('✅ Database Connected Successfully');
            return mongoose.connection;
        })
        .catch((error) => {
            console.error(
                '❌ Database Connection Failed:',
                error.message
            );

            dbConnectionPromise = null;

            return null;
        });

    return dbConnectionPromise;
};

// ==============================================================================
// DATABASE READY CHECK
// ==============================================================================

async function ensureDatabaseConnection() {
    try {
        if (mongoose.connection.readyState === 1) {
            return true;
        }

        const connection = await connectdb();

        if (
            connection &&
            mongoose.connection.readyState === 1
        ) {
            return true;
        }

        return false;
    } catch (error) {
        console.error(
            '❌ MongoDB connection check failed:',
            error.message
        );

        return false;
    }
}

// ==============================================================================
// MONGODB CONNECTION EVENTS
// ==============================================================================

mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connection established');
});

mongoose.connection.on('error', (error) => {
    console.error(
        '🔴 MongoDB connection error:',
        error.message
    );
});

mongoose.connection.on('disconnected', () => {
    console.warn('🟡 MongoDB disconnected');
});

// ==============================================================================
// SESSION SCHEMA
// ==============================================================================

const hasinduSessionSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    credentials: {
        type: Object,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ==============================================================================
// USER CONFIG SCHEMA
// ==============================================================================

const hasinduConfigSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    config: {
        AUTO_RECORDING: {
            type: String,
            default: 'false'
        },

        AUTO_TYPING: {
            type: String,
            default: 'false'
        },

        ANTI_CALL: {
            type: String,
            default: 'false'
        },

        REJECT_MSG: {
            type: String,
            default:
                '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..! *'
        },

        READ_MESSAGE: {
            type: String,
            default: 'false'
        },

        AUTO_VIEW_STATUS: {
            type: String,
            default: 'false'
        },

        AUTO_LIKE_STATUS: {
            type: String,
            default: 'false'
        },

        AUTO_STATUS_REPLY: {
            type: String,
            default: 'false'
        },

        AUTO_STATUS_MSG: {
            type: String,
            default: 'Hello from HASINDU MD 🔥'
        },

        AUTO_LIKE_EMOJI: {
            type: Array,
            default: ['❤️', '👍', '😮', '😎']
        },

        ANTIDELETE: {
            type: String,
            default: 'false'
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ==============================================================================
// OTP SCHEMA
// ==============================================================================

const hasinduOtpSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        index: true
    },

    otp: {
        type: String,
        required: true
    },

    config: {
        type: Object,
        required: true
    },

    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60000),
        index: {
            expires: '5m'
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ==============================================================================
// ACTIVE NUMBER SCHEMA
// ==============================================================================

const hasinduActiveNumberSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    lastConnected: {
        type: Date,
        default: Date.now
    },

    isActive: {
        type: Boolean,
        default: true
    },

    connectionInfo: {
        ip: String,
        userAgent: String,
        timestamp: Date
    }
});

// ==============================================================================
// STATS SCHEMA
// ==============================================================================

const hasinduStatsSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true
    },

    date: {
        type: String,
        required: true
    },

    commandsUsed: {
        type: Number,
        default: 0
    },

    messagesReceived: {
        type: Number,
        default: 0
    },

    messagesSent: {
        type: Number,
        default: 0
    },

    groupsInteracted: {
        type: Number,
        default: 0
    }
});

// ==============================================================================
// HASINDU MD — MODEL EXPORTS
// ==============================================================================

// Collection names are intentionally unchanged.
// This keeps existing MongoDB data compatible.

const Session = mongoose.model(
    'HasinduSession',
    hasinduSessionSchema,
    'inconnuboysessions'
);

const UserConfig = mongoose.model(
    'HasinduConfig',
    hasinduConfigSchema,
    'inconnuboyconfigs'
);

const OTP = mongoose.model(
    'HasinduOTP',
    hasinduOtpSchema,
    'inconnuboyotps'
);

const ActiveNumber = mongoose.model(
    'HasinduActiveNumber',
    hasinduActiveNumberSchema,
    'inconnuboyactivenumbers'
);

const Stats = mongoose.model(
    'HasinduStats',
    hasinduStatsSchema,
    'inconnuboystats'
);

// ==============================================================================
// SESSION MANAGEMENT
// ==============================================================================

async function saveSessionToMongoDB(number, credentials) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return false;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        await Session.findOneAndUpdate(
            {
                number: cleanNumber
            },
            {
                credentials: credentials,
                updatedAt: new Date()
            },
            {
                upsert: true,
                new: true
            }
        );

        console.log(
            `📁 [HASINDU-MD] Session saved for ${cleanNumber}`
        );

        return true;

    } catch (error) {
        console.error(
            '❌ Error saving session to MongoDB:',
            error.message
        );

        return false;
    }
}

async function getSessionFromMongoDB(number) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return null;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        const session = await Session.findOne({
            number: cleanNumber
        }).lean();

        return session
            ? session.credentials
            : null;

    } catch (error) {
        console.error(
            '❌ Error getting session from MongoDB:',
            error.message
        );

        return null;
    }
}

async function deleteSessionFromMongoDB(number) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return false;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        await Session.deleteOne({
            number: cleanNumber
        });

        await ActiveNumber.deleteOne({
            number: cleanNumber
        });

        console.log(
            `🗑️ Session deleted from MongoDB for ${cleanNumber}`
        );

        return true;

    } catch (error) {
        console.error(
            '❌ Error deleting session from MongoDB:',
            error.message
        );

        return false;
    }
}

// ==============================================================================
// USER CONFIGURATION
// ==============================================================================

async function getUserConfigFromMongoDB(number) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return {};
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        const config = await UserConfig.findOne({
            number: cleanNumber
        }).lean();

        if (config) {
            return config.config;
        }

        const defaultConfig = {
            AUTO_RECORDING: 'false',
            AUTO_TYPING: 'false',
            ANTI_CALL: 'false',

            REJECT_MSG:
                '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..! *',

            READ_MESSAGE: 'false',

            AUTO_VIEW_STATUS: 'false',

            AUTO_LIKE_STATUS: 'false',

            AUTO_STATUS_REPLY: 'false',

            AUTO_STATUS_MSG:
                'Hello from HASINDU MD 🔥',

            AUTO_LIKE_EMOJI: [
                '❤️',
                '👍',
                '😮',
                '😎'
            ],

            ANTIDELETE: 'false'
        };

        await UserConfig.create({
            number: cleanNumber,
            config: defaultConfig
        });

        return defaultConfig;

    } catch (error) {
        console.error(
            '❌ Error getting user config from MongoDB:',
            error.message
        );

        return {};
    }
}

// ==============================================================================
// UPDATE USER CONFIGURATION
// ==============================================================================

async function updateUserConfigInMongoDB(
    number,
    newConfig
) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return false;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        await UserConfig.findOneAndUpdate(
            {
                number: cleanNumber
            },
            {
                config: newConfig,
                updatedAt: new Date()
            },
            {
                upsert: true,
                new: true
            }
        );

        console.log(
            `⚙️ [HASINDU-MD] Config updated for ${cleanNumber}`
        );

        return true;

    } catch (error) {
        console.error(
            '❌ Error updating user config in MongoDB:',
            error.message
        );

        return false;
    }
}

// ==============================================================================
// OTP MANAGEMENT
// ==============================================================================

async function saveOTPToMongoDB(
    number,
    otp,
    config
) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return false;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        await OTP.create({
            number: cleanNumber,
            otp: otp,
            config: config
        });

        console.log(
            `🔐 OTP saved for ${cleanNumber}`
        );

        return true;

    } catch (error) {
        console.error(
            '❌ Error saving OTP to MongoDB:',
            error.message
        );

        return false;
    }
}

async function verifyOTPFromMongoDB(
    number,
    otp
) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return {
                valid: false,
                error: 'Database unavailable'
            };
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        const otpRecord = await OTP.findOne({
            number: cleanNumber,
            otp: otp,
            expiresAt: {
                $gt: new Date()
            }
        }).lean();

        if (!otpRecord) {
            return {
                valid: false,
                error: 'Invalid or expired OTP'
            };
        }

        await OTP.deleteOne({
            _id: otpRecord._id
        });

        return {
            valid: true,
            config: otpRecord.config
        };

    } catch (error) {
        console.error(
            '❌ Error verifying OTP from MongoDB:',
            error.message
        );

        return {
            valid: false,
            error: 'Verification error'
        };
    }
}

// ==============================================================================
// ACTIVE NUMBERS
// ==============================================================================

async function addNumberToMongoDB(number) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return false;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        await ActiveNumber.findOneAndUpdate(
            {
                number: cleanNumber
            },
            {
                lastConnected: new Date(),
                isActive: true
            },
            {
                upsert: true,
                new: true
            }
        );

        return true;

    } catch (error) {
        console.error(
            '❌ Error adding number to MongoDB:',
            error.message
        );

        return false;
    }
}

async function removeNumberFromMongoDB(number) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return false;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        await ActiveNumber.deleteOne({
            number: cleanNumber
        });

        return true;

    } catch (error) {
        console.error(
            '❌ Error removing number from MongoDB:',
            error.message
        );

        return false;
    }
}

async function getAllNumbersFromMongoDB() {
    try {
        if (!(await ensureDatabaseConnection())) {
            console.error(
                '⚠️ MongoDB unavailable. Active numbers cannot be loaded.'
            );

            return [];
        }

        const activeNumbers = await ActiveNumber.find({
            isActive: true
        }).lean();

        return activeNumbers.map(
            num => num.number
        );

    } catch (error) {
        console.error(
            '❌ Error getting numbers from MongoDB:',
            error.message
        );

        return [];
    }
}

// ==============================================================================
// STATISTICS
// ==============================================================================

async function incrementStats(
    number,
    field
) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        const today = new Date()
            .toISOString()
            .split('T')[0];

        const allowedFields = [
            'commandsUsed',
            'messagesReceived',
            'messagesSent',
            'groupsInteracted'
        ];

        if (!allowedFields.includes(field)) {
            console.warn(
                `⚠️ Invalid statistics field: ${field}`
            );

            return;
        }

        await Stats.findOneAndUpdate(
            {
                number: cleanNumber,
                date: today
            },
            {
                $inc: {
                    [field]: 1
                }
            },
            {
                upsert: true,
                new: true
            }
        );

    } catch (error) {
        console.error(
            '❌ Error updating stats:',
            error.message
        );
    }
}

async function getStatsForNumber(number) {
    try {
        if (!(await ensureDatabaseConnection())) {
            return [];
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');

        const stats = await Stats.find({
            number: cleanNumber
        })
            .sort({
                date: -1
            })
            .limit(30)
            .lean();

        return stats;

    } catch (error) {
        console.error(
            '❌ Error getting stats:',
            error.message
        );

        return [];
    }
}

// ==============================================================================
// HASINDU MD — EXPORTS
// ==============================================================================

module.exports = {
    connectdb,

    Session,
    UserConfig,
    OTP,
    ActiveNumber,
    Stats,

    // Session
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,

    // Configuration
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,

    // OTP
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,

    // Numbers
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,

    // Statistics
    incrementStats,
    getStatsForNumber,

    // Compatibility
    getUserConfig: async (number) => {
        const config =
            await getUserConfigFromMongoDB(number);

        return config || {};
    },

    updateUserConfig:
        updateUserConfigInMongoDB
};
