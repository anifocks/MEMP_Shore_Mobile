// auth-service/models/userModel.js
import sql from 'mssql';
import { executeQuery } from '../utils/db.js';

// Define the columns for reusable queries (UPDATED to include User_Rights and Require2FA)
const USER_COLUMNS_WITH_PASSWORD = 'User_ID, Username, Email, Password, IsActive, FirstName, LastName, Designation, Fleet, Vessels, ImageURL, User_Rights, Require2FA';
const USER_COLUMNS_PUBLIC = 'User_ID, Username, Email, IsActive, FirstName, LastName, Designation, Fleet, Vessels, ImageURL, User_Rights, Require2FA';


// =========================================================
// AUTHENTICATION FUNCTIONS 
// =========================================================

export const findUserByUsername = async (username) => {
    // UPDATED: Use defined columns
    const query = `SELECT ${USER_COLUMNS_WITH_PASSWORD} FROM dbo.USER_INFO WHERE LOWER(TRIM(Username)) = LOWER(TRIM(@username)) AND IsActive = 1`;
    const inputs = [{ name: 'username', type: sql.NVarChar, value: username }];
    const result = await executeQuery(query, inputs, "FindUserByUsername");
    return result.recordset[0];
};

export const findUserByEmail = async (email) => {
    // UPDATED: Use defined columns
    const query = `SELECT ${USER_COLUMNS_WITH_PASSWORD} FROM dbo.USER_INFO WHERE LOWER(TRIM(Email)) = LOWER(TRIM(@email)) AND IsActive = 1`;
    const inputs = [{ name: 'email', type: sql.NVarChar, value: email }];
    const result = await executeQuery(query, inputs, "FindUserByEmail");
    return result.recordset[0];
};

export const createUser = async (username, email, hashedPassword, userRights) => {
    // UPDATED: Base registration function to accept userRights
    const query = `
        INSERT INTO dbo.USER_INFO (Username, Email, Password, IsActive, Created_Date, User_Rights) 
        OUTPUT Inserted.User_ID, Inserted.Username, Inserted.Email, Inserted.IsActive, Inserted.User_Rights
        VALUES (@username, @email, @hashedPassword, 1, GETDATE(), @userRights)
    `;
    const inputs = [
        { name: 'username', type: sql.NVarChar, value: username },
        { name: 'email', type: sql.NVarChar, value: email },
        { name: 'hashedPassword', type: sql.NVarChar, value: hashedPassword },
        { name: 'userRights', type: sql.NVarChar, value: userRights }
    ];
    const result = await executeQuery(query, inputs, "CreateUser");
    return result.recordset[0];
};

export const updateUserPassword = async (username, hashedPassword) => {
    // Update password for an active user
    const query = 'UPDATE dbo.USER_INFO SET Password = @hashedPassword WHERE LOWER(TRIM(Username)) = LOWER(TRIM(@username)) AND IsActive = 1';
    const inputs = [
        { name: 'username', type: sql.NVarChar, value: username },
        { name: 'hashedPassword', type: sql.NVarChar, value: hashedPassword }
    ];
    const result = await executeQuery(query, inputs, "UpdateUserPassword");
    return result.rowsAffected[0] > 0;
};


// =========================================================
// USER MANAGEMENT FUNCTIONS
// =========================================================

export const getAllActiveUsers = async () => {
    // Gets all active (IsActive = 1) users for the list view
    const query = `
        SELECT ${USER_COLUMNS_PUBLIC}
        FROM dbo.USER_INFO
        WHERE IsActive = 1
        ORDER BY Username
    `;
    const result = await executeQuery(query, [], "GetAllActiveUsers");
    return result.recordset;
};

export const getUserById = async (userId) => {
    // Retrieves a single user (used for View/Edit)
    const query = `
        SELECT ${USER_COLUMNS_PUBLIC}, Password
        FROM dbo.USER_INFO
        WHERE User_ID = @userId
    `;
    const inputs = [{ name: 'userId', type: sql.Int, value: userId }];
    const result = await executeQuery(query, inputs, "GetUserById");
    return result.recordset[0];
};

// NEW FUNCTION: Fetches distinct User_Rights
export const getDistinctUserRights = async () => {
    // Fetches the distinct list of non-null, non-empty user rights
    const query = `
        SELECT DISTINCT User_Rights
        FROM dbo.USER_INFO
        WHERE User_Rights IS NOT NULL AND TRIM(User_Rights) <> ''
        ORDER BY User_Rights
    `;
    const result = await executeQuery(query, [], "GetDistinctUserRights");
    // Return an array of strings
    return result.recordset.map(record => record.User_Rights);
};


export const createUserWithDetails = async (username, email, hashedPassword, firstName, lastName, designation, fleet, vessels, imageUrl, userRights, require2FA = 0) => {
    // Creates a user with full details (Admin Add User)
    const query = `
        INSERT INTO dbo.USER_INFO (Username, Email, Password, IsActive, Created_Date, FirstName, LastName, Designation, Fleet, Vessels, ImageURL, User_Rights, Require2FA) 
        OUTPUT Inserted.User_ID, Inserted.Username, Inserted.Email, Inserted.IsActive
        VALUES (@username, @email, @hashedPassword, 1, GETDATE(), @firstName, @lastName, @designation, @fleet, @vessels, @imageUrl, @userRights, @require2FA)
    `;
    const inputs = [
        { name: 'username', type: sql.NVarChar, value: username },
        { name: 'email', type: sql.NVarChar, value: email },
        { name: 'hashedPassword', type: sql.NVarChar, value: hashedPassword },
        { name: 'firstName', type: sql.NVarChar, value: firstName || null },
        { name: 'lastName', type: sql.NVarChar, value: lastName || null },
        { name: 'designation', type: sql.NVarChar, value: designation || null },
        { name: 'fleet', type: sql.NVarChar, value: fleet || null },
        { name: 'vessels', type: sql.NVarChar, value: vessels || null }, 
        { name: 'imageUrl', type: sql.NVarChar, value: imageUrl || null },
        { name: 'userRights', type: sql.NVarChar, value: userRights || 'Vessel User' }, // Use default if null
        { name: 'require2FA', type: sql.Bit, value: require2FA ? 1 : 0 }
    ];
    const result = await executeQuery(query, inputs, "CreateUserWithDetails");
    return result.recordset[0];
};

// UPDATED: Handles optional 'hashedNewPassword' for updating user details and password simultaneously.
export const updateUserDetails = async (userId, username, email, firstName, lastName, designation, fleet, vessels, imageUrl, hashedNewPassword = null, userRights, require2FA = 0) => {
    let updateFields = `
        Username = @username, 
        Email = @email,
        FirstName = @firstName,
        LastName = @lastName,
        Designation = @designation,
        Fleet = @fleet,
        Vessels = @vessels,
        ImageURL = @imageUrl,
        User_Rights = @userRights,
        Require2FA = @require2FA
    `;
    
    const inputs = [
        { name: 'userId', type: sql.Int, value: userId },
        { name: 'username', type: sql.NVarChar, value: username },
        { name: 'email', type: sql.NVarChar, value: email },
        { name: 'firstName', type: sql.NVarChar, value: firstName || null },
        { name: 'lastName', type: sql.NVarChar, value: lastName || null },
        { name: 'designation', type: sql.NVarChar, value: designation || null },
        { name: 'fleet', type: sql.NVarChar, value: fleet || null },
        { name: 'vessels', type: sql.NVarChar, value: vessels || null },
        { name: 'imageUrl', type: sql.NVarChar, value: imageUrl || null },
        { name: 'userRights', type: sql.NVarChar, value: userRights || 'Vessel User' },
        { name: 'require2FA', type: sql.Bit, value: require2FA ? 1 : 0 }
    ];

    if (hashedNewPassword) {
        updateFields += ', Password = @hashedPassword';
        // Add the password input parameter only if it exists
        inputs.push({ name: 'hashedPassword', type: sql.NVarChar, value: hashedNewPassword });
    }

    const query = `
        UPDATE dbo.USER_INFO 
        SET ${updateFields}
        WHERE User_ID = @userId
    `;
    
    const result = await executeQuery(query, inputs, "UpdateUserDetails");
    return result.rowsAffected[0] > 0;
};

export const softDeleteUser = async (userId) => {
    // Soft delete: sets IsActive to 0 (deleted).
    const query = 'UPDATE dbo.USER_INFO SET IsActive = 0 WHERE User_ID = @userId AND IsActive = 1';
    const inputs = [{ name: 'userId', type: sql.Int, value: userId }];
    const result = await executeQuery(query, inputs, "SoftDeleteUser");
    return result.rowsAffected[0] > 0;
};