const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const axios = require("axios");

dotenv.config();

const app = express();

const PORT = 5000;
const SALESFORCE_API_VERSION = "v65.0";
const PAGE_SIZE = 20;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());

// ======================================================
// TEMPORARY AUTH STORAGE
// LOCAL DEVELOPMENT ONLY
// ======================================================

let codeVerifier = null;
let accessToken = null;
let instanceUrl = null;

// ======================================================
// SALESFORCE OBJECT CONFIGURATION
// ======================================================

const OBJECT_CONFIG = {
    accounts: {
        objectName: "Account",

        fields: [
            "Id",
            "Name",
            "Industry",
            "Phone",
            "Website",
            "Type"
        ],

        createRequired: [
            "Name"
        ]
    },

    opportunities: {
        objectName: "Opportunity",

        fields: [
            "Id",
            "Name",
            "StageName",
            "CloseDate",
            "Amount",
            "Type"
        ],

        createRequired: [
            "Name",
            "StageName",
            "CloseDate"
        ]
    },

    leads: {
        objectName: "Lead",

        fields: [
            "Id",
            "FirstName",
            "LastName",
            "Company",
            "Email",
            "Phone"
        ],

        createRequired: [
            "LastName",
            "Company"
        ]
    },

    contacts: {
        objectName: "Contact",

        fields: [
            "Id",
            "FirstName",
            "LastName",
            "Email",
            "Phone",
            "Title"
        ],

        createRequired: [
            "LastName"
        ]
    },

    cases: {
        objectName: "Case",

        fields: [
            "Id",
            "Subject",
            "Status",
            "Priority",
            "Origin",
            "Description"
        ],

        createRequired: [
            "Subject"
        ]
    }
};

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message:
            "CloudVandana Salesforce CRUD Backend is running",
        version:
            SALESFORCE_API_VERSION,
        pageSize:
            PAGE_SIZE
    });
});

// ======================================================
// GENERATE PKCE
// ======================================================

function generatePKCE() {

    const verifier =
        crypto
            .randomBytes(32)
            .toString("base64url");

    const challenge =
        crypto
            .createHash("sha256")
            .update(verifier)
            .digest("base64url");

    return {
        verifier,
        challenge
    };
}

// ======================================================
// CHECK AUTHENTICATION
// ======================================================

function isAuthenticated() {

    return Boolean(
        accessToken &&
        instanceUrl
    );
}

// ======================================================
// AUTHENTICATION ERROR
// ======================================================

function authenticationError(res) {

    return res.status(401).json({

        success: false,

        error:
            "Not authenticated with Salesforce",

        message:
            "Please login with Salesforce first."
    });
}

// ======================================================
// GET OBJECT CONFIG
// ======================================================

function getObjectConfig(resource) {

    return OBJECT_CONFIG[resource];
}

// ======================================================
// SALESFORCE LOGIN
// ======================================================

app.get(
    "/auth/login",
    (req, res) => {

        try {

            const pkce =
                generatePKCE();

            codeVerifier =
                pkce.verifier;

            const params =
                new URLSearchParams({

                    response_type:
                        "code",

                    client_id:
                        process.env.SALESFORCE_CLIENT_ID,

                    redirect_uri:
                        process.env.SALESFORCE_CALLBACK_URL,

                    scope:
                        "api refresh_token",

                    code_challenge:
                        pkce.challenge,

                    code_challenge_method:
                        "S256"
                });

            const authUrl =
                "https://login.salesforce.com/services/oauth2/authorize?" +
                params.toString();

            console.log(
                "Opening Salesforce OAuth..."
            );

            res.redirect(authUrl);

        } catch (error) {

            console.error(
                "Login Error:",
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    "Unable to start Salesforce login",

                details:
                    error.message
            });
        }
    }
);

// ======================================================
// SALESFORCE OAUTH CALLBACK
// ======================================================

app.get(
    "/auth/callback",
    async (req, res) => {

        try {

            const code =
                req.query.code;

            // ------------------------------------------
            // CHECK AUTHORIZATION CODE
            // ------------------------------------------

            if (!code) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Authorization code not received"
                });
            }

            // ------------------------------------------
            // CHECK PKCE
            // ------------------------------------------

            if (!codeVerifier) {

                return res.status(400).json({

                    success: false,

                    error:
                        "PKCE code verifier not found"
                });
            }

            // ------------------------------------------
            // TOKEN REQUEST
            // ------------------------------------------

            const tokenResponse =
                await axios.post(

                    "https://login.salesforce.com/services/oauth2/token",

                    new URLSearchParams({

                        grant_type:
                            "authorization_code",

                        code:
                            code,

                        client_id:
                            process.env.SALESFORCE_CLIENT_ID,

                        client_secret:
                            process.env.SALESFORCE_CLIENT_SECRET,

                        redirect_uri:
                            process.env.SALESFORCE_CALLBACK_URL,

                        code_verifier:
                            codeVerifier

                    }).toString(),

                    {
                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        }
                    }
                );

            const data =
                tokenResponse.data;

            // ------------------------------------------
            // STORE AUTHENTICATION
            // ------------------------------------------

            accessToken =
                data.access_token;

            instanceUrl =
                data.instance_url;

            codeVerifier =
                null;

            console.log(
                "======================================"
            );

            console.log(
                "Salesforce OAuth successful!"
            );

            console.log(
                "Instance URL:",
                instanceUrl
            );

            console.log(
                "User ID:",
                data.id
            );

            console.log(
                "======================================"
            );

            // ------------------------------------------
            // RETURN TO FRONTEND
            // ------------------------------------------

            res.redirect(
                "http://localhost:5173"
            );

        } catch (error) {

            console.error(
                "OAuth Error:",
                error.response?.data ||
                error.message
            );

            res.status(
                error.response?.status ||
                500
            ).json({

                success: false,

                error:
                    "Salesforce OAuth failed",

                details:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

// ======================================================
// AUTHENTICATION STATUS
// ======================================================

app.get(
    "/auth/status",
    (req, res) => {

        if (
            !accessToken ||
            !instanceUrl
        ) {

            return res.json({

                authenticated:
                    false,

                message:
                    "Not authenticated with Salesforce"
            });
        }

        res.json({

            authenticated:
                true,

            message:
                "Authenticated with Salesforce",

            instanceUrl:
                instanceUrl
        });
    }
);

// ======================================================
// LOGOUT
// ======================================================

app.get(
    "/auth/logout",
    (req, res) => {

        accessToken =
            null;

        instanceUrl =
            null;

        codeVerifier =
            null;

        res.json({

            success:
                true,

            message:
                "Salesforce authentication cleared"
        });
    }
);

// ======================================================
// GET RECORDS WITH PAGINATION
// ======================================================
//
// Example:
//
// /api/accounts?page=1
// /api/accounts?page=2
// /api/accounts?page=3
//
// PAGE SIZE = 20
//
// 25 records:
//
// Page 1 -> 20 records
// Page 2 -> 5 records
//
// 41 records:
//
// Page 1 -> 20
// Page 2 -> 20
// Page 3 -> 1
//
// ======================================================

app.get(
    "/api/:resource",
    async (req, res) => {

        try {

            // ------------------------------------------
            // AUTH CHECK
            // ------------------------------------------

            if (!isAuthenticated()) {

                return authenticationError(res);
            }

            // ------------------------------------------
            // RESOURCE
            // ------------------------------------------

            const resource =
                req.params.resource;

            // ------------------------------------------
            // OBJECT CONFIG
            // ------------------------------------------

            const config =
                getObjectConfig(resource);

            if (!config) {

                return res.status(404).json({

                    success:
                        false,

                    error:
                        "Unsupported Salesforce object"
                });
            }

            // ------------------------------------------
            // PAGE NUMBER
            // ------------------------------------------

            let page =
                Number(req.query.page || 1);

            // ------------------------------------------
            // VALIDATE PAGE
            // ------------------------------------------

            if (
                !Number.isInteger(page) ||
                page < 1
            ) {

                page = 1;
            }

            // ------------------------------------------
            // CALCULATE OFFSET
            // ------------------------------------------

            const offset =
                (page - 1) * PAGE_SIZE;

            console.log(
                "======================================"
            );

            console.log(
                `GET ${config.objectName}`
            );

            console.log(
                "PAGE:",
                page
            );

            console.log(
                "PAGE SIZE:",
                PAGE_SIZE
            );

            console.log(
                "OFFSET:",
                offset
            );

            // ==================================================
            // GET TOTAL RECORD COUNT
            // ==================================================

            const countQuery =
                `SELECT COUNT(Id) totalCount FROM ${config.objectName}`;

            console.log(
                "COUNT QUERY:",
                countQuery
            );

            const countResponse =
                await axios.get(

                    `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/query`,

                    {

                        params: {
                            q: countQuery
                        },

                        headers: {

                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            // ==================================================
            // EXTRACT TOTAL COUNT
            // ==================================================

            let totalSize = 0;

            console.log(
                "COUNT RESPONSE:",
                JSON.stringify(
                    countResponse.data,
                    null,
                    2
                )
            );

            if (
                countResponse.data &&
                countResponse.data.records &&
                countResponse.data.records.length > 0
            ) {

                totalSize =
                    Number(
                        countResponse.data.records[0].totalCount
                    ) || 0;
            }

            console.log(
                "TOTAL RECORD COUNT:",
                totalSize
            );


            // ==================================================
            // GET CURRENT PAGE
            // ==================================================

            const fields =
                config.fields.join(", ");

            const query =
                `
                SELECT ${fields}
                FROM ${config.objectName}
                ORDER BY CreatedDate DESC, Id DESC
                LIMIT ${PAGE_SIZE}
                OFFSET ${offset}
                `;

            console.log(
                "DATA QUERY:",
                query
            );

            const response =
                await axios.get(

                    `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/query`,

                    {

                        params: {
                            q: query
                        },

                        headers: {

                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            // ------------------------------------------
            // RECORDS
            // ------------------------------------------

            const records =
                response.data.records || [];

            // ------------------------------------------
            // TOTAL PAGES
            // ------------------------------------------

            const totalPages =
                Math.ceil(
                    totalSize / PAGE_SIZE
                );

            // ------------------------------------------
            // HAS PREVIOUS
            // ------------------------------------------

            const hasPrevious =
                page > 1;

            // ------------------------------------------
            // HAS NEXT
            // ------------------------------------------

            const hasNext =
                page < totalPages;

            // ------------------------------------------
            // DEBUG
            // ------------------------------------------

            console.log(
                "TOTAL SIZE:",
                totalSize
            );

            console.log(
                "RECORDS RETURNED:",
                records.length
            );

            console.log(
                "TOTAL PAGES:",
                totalPages
            );

            console.log(
                "HAS PREVIOUS:",
                hasPrevious
            );

            console.log(
                "HAS NEXT:",
                hasNext
            );

            console.log(
                "======================================"
            );

            // ==================================================
            // RESPONSE
            // ==================================================

            res.json({

                success:
                    true,

                resource:
                    resource,

                objectName:
                    config.objectName,

                page:
                    page,

                pageSize:
                    PAGE_SIZE,

                totalSize:
                    totalSize,

                totalPages:
                    totalPages,

                recordCount:
                    records.length,

                hasPrevious:
                    hasPrevious,

                hasNext:
                    hasNext,

                previousPage:
                    hasPrevious
                        ? page - 1
                        : null,

                nextPage:
                    hasNext
                        ? page + 1
                        : null,

                records:
                    records
            });

        } catch (error) {

            console.error(
                "Salesforce GET Error:",
                error.response?.data ||
                error.message
            );

            // ------------------------------------------
            // AUTH EXPIRED
            // ------------------------------------------

            if (
                error.response?.status === 401
            ) {

                accessToken =
                    null;

                instanceUrl =
                    null;

                return res.status(401).json({

                    success:
                        false,

                    error:
                        "Salesforce authentication expired",

                    message:
                        "Please login with Salesforce again."
                });
            }

            // ------------------------------------------
            // GENERAL ERROR
            // ------------------------------------------

            return res.status(
                error.response?.status || 500
            ).json({

                success:
                    false,

                error:
                    "Failed to fetch Salesforce records",

                details:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

// ======================================================
// GET SINGLE RECORD
// ======================================================

app.get(
    "/api/:resource/:id",
    async (req, res) => {

        try {

            // ------------------------------------------
            // AUTH CHECK
            // ------------------------------------------

            if (!isAuthenticated()) {

                return authenticationError(res);
            }

            // ------------------------------------------
            // CONFIG
            // ------------------------------------------

            const resource =
                req.params.resource;

            const id =
                req.params.id;

            const config =
                getObjectConfig(resource);

            if (!config) {

                return res.status(404).json({

                    success:
                        false,

                    error:
                        "Unsupported Salesforce object"
                });
            }

            // ------------------------------------------
            // GET RECORD
            // ------------------------------------------

            const response =
                await axios.get(

                    `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${config.objectName}/${id}`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            res.json({

                success:
                    true,

                record:
                    response.data
            });

        } catch (error) {

            console.error(
                "Salesforce GET Single Error:",
                error.response?.data ||
                error.message
            );

            res.status(
                error.response?.status || 500
            ).json({

                success:
                    false,

                error:
                    "Failed to fetch Salesforce record",

                details:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

// ======================================================
// CREATE RECORD
// ======================================================

app.post(
    "/api/:resource",
    async (req, res) => {

        try {

            // ------------------------------------------
            // AUTH CHECK
            // ------------------------------------------

            if (!isAuthenticated()) {

                return authenticationError(res);
            }

            // ------------------------------------------
            // CONFIG
            // ------------------------------------------

            const resource =
                req.params.resource;

            const config =
                getObjectConfig(resource);

            if (!config) {

                return res.status(404).json({

                    success:
                        false,

                    error:
                        "Unsupported Salesforce object"
                });
            }

            // ------------------------------------------
            // REQUEST BODY
            // ------------------------------------------

            const body =
                req.body || {};

            // ------------------------------------------
            // REQUIRED FIELD VALIDATION
            // ------------------------------------------

            for (
                const field
                of config.createRequired
            ) {

                const value =
                    body[field];

                if (
                    value === undefined ||
                    value === null ||
                    String(value).trim() === ""
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        error:
                            `${field} is required`
                    });
                }
            }

            // ------------------------------------------
            // BUILD CREATE DATA
            // ------------------------------------------

            const createData = {};

            config.fields
                .filter(
                    field =>
                        field !== "Id"
                )
                .forEach(
                    field => {

                        if (
                            body[field] !== undefined
                        ) {

                            createData[field] =
                                body[field];
                        }
                    }
                );

            console.log(
                `Creating ${config.objectName}:`,
                createData
            );

            // ------------------------------------------
            // CREATE IN SALESFORCE
            // ------------------------------------------

            const response =
                await axios.post(

                    `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${config.objectName}`,

                    createData,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            console.log(
                `${config.objectName} created:`,
                response.data
            );

            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            res.status(201).json({

                success:
                    true,

                message:
                    `${config.objectName} created successfully`,

                data:
                    response.data
            });

        } catch (error) {

            console.error(
                "Salesforce CREATE Error:",
                error.response?.data ||
                error.message
            );

            res.status(
                error.response?.status || 500
            ).json({

                success:
                    false,

                error:
                    "Failed to create Salesforce record",

                details:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

// ======================================================
// UPDATE RECORD
// ======================================================

app.put(
    "/api/:resource/:id",
    async (req, res) => {

        console.log(
            `PUT /api/${req.params.resource}/${req.params.id}`
        );

        try {

            // ------------------------------------------
            // AUTH CHECK
            // ------------------------------------------

            if (!isAuthenticated()) {

                return authenticationError(res);
            }

            // ------------------------------------------
            // CONFIG
            // ------------------------------------------

            const resource =
                req.params.resource;

            const id =
                req.params.id;

            const config =
                getObjectConfig(resource);

            if (!config) {

                return res.status(404).json({

                    success:
                        false,

                    error:
                        "Unsupported Salesforce object"
                });
            }

            // ------------------------------------------
            // REQUEST BODY
            // ------------------------------------------

            const body =
                req.body || {};

            console.log(
                "Record ID:",
                id
            );

            console.log(
                "Request body:",
                body
            );

            // ------------------------------------------
            // BUILD UPDATE DATA
            // ------------------------------------------

            const updateData = {};

            config.fields
                .filter(
                    field =>
                        field !== "Id"
                )
                .forEach(
                    field => {

                        if (
                            body[field] !== undefined
                        ) {

                            updateData[field] =
                                body[field];
                        }
                    }
                );

            // ------------------------------------------
            // CHECK DATA
            // ------------------------------------------

            if (
                Object.keys(updateData).length === 0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "No fields provided for update"
                });
            }

            // ------------------------------------------
            // REQUIRED FIELD VALIDATION
            // ------------------------------------------

            for (
                const field
                of config.createRequired
            ) {

                if (
                    updateData[field] !== undefined &&
                    (
                        updateData[field] === null ||
                        String(
                            updateData[field]
                        ).trim() === ""
                    )
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        error:
                            `${field} cannot be empty`
                    });
                }
            }

            console.log(
                `Updating ${config.objectName}:`,
                updateData
            );

            // ------------------------------------------
            // UPDATE IN SALESFORCE
            // ------------------------------------------

            await axios.patch(

                `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${config.objectName}/${id}`,

                updateData,

                {

                    headers: {

                        Authorization:
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );

            console.log(
                `${config.objectName} updated:`,
                id
            );

            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            res.json({

                success:
                    true,

                message:
                    `${config.objectName} updated successfully`,

                id:
                    id,

                updatedFields:
                    updateData
            });

        } catch (error) {

            console.error(
                "Salesforce UPDATE Error:",
                error.response?.data ||
                error.message
            );

            res.status(
                error.response?.status || 500
            ).json({

                success:
                    false,

                error:
                    "Failed to update Salesforce record",

                details:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

// ======================================================
// DELETE RECORD
// ======================================================

app.delete(
    "/api/:resource/:id",
    async (req, res) => {

        try {

            // ------------------------------------------
            // AUTH CHECK
            // ------------------------------------------

            if (!isAuthenticated()) {

                return authenticationError(res);
            }

            // ------------------------------------------
            // CONFIG
            // ------------------------------------------

            const resource =
                req.params.resource;

            const id =
                req.params.id;

            const config =
                getObjectConfig(resource);

            if (!config) {

                return res.status(404).json({

                    success:
                        false,

                    error:
                        "Unsupported Salesforce object"
                });
            }

            // ------------------------------------------
            // DELETE FROM SALESFORCE
            // ------------------------------------------

            await axios.delete(

                `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${config.objectName}/${id}`,

                {

                    headers: {

                        Authorization:
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );

            console.log(
                `${config.objectName} deleted:`,
                id
            );

            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            res.json({

                success:
                    true,

                message:
                    `${config.objectName} deleted successfully`,

                id:
                    id
            });

        } catch (error) {

            console.error(
                "Salesforce DELETE Error:",
                error.response?.data ||
                error.message
            );

            res.status(
                error.response?.status || 500
            ).json({

                success:
                    false,

                error:
                    "Failed to delete Salesforce record",

                details:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

// ======================================================
// 404 HANDLER
// ======================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success:
                false,

            error:
                "API route not found",

            path:
                req.originalUrl
        });
    }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Server Error:",
            error
        );

        res.status(500).json({

            success:
                false,

            error:
                "Internal server error",

            details:
                error.message
        });
    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log(
            `Salesforce API: ${SALESFORCE_API_VERSION}`
        );

        console.log(
            `Page size: ${PAGE_SIZE}`
        );

        console.log(
            "Pagination: LIMIT + OFFSET"
        );

        console.log(
            "Supported objects:"
        );

        console.log(
            "- Account"
        );

        console.log(
            "- Opportunity"
        );

        console.log(
            "- Lead"
        );

        console.log(
            "- Contact"
        );

        console.log(
            "- Case"
        );

        console.log(
            "======================================"
        );
    }
);