-- Add 2FA (Two-Factor Authentication) column to USER_INFO table
-- 1 = 2FA enabled (OTP required), 0 = 2FA disabled (password only)

USE [Viswa_Memp_Shore];
GO

-- Check if column already exists
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[USER_INFO]') 
    AND name = 'Require2FA'
)
BEGIN
    -- Add the column with default value 0 (2FA disabled by default)
    ALTER TABLE [dbo].[USER_INFO]
    ADD Require2FA BIT NOT NULL DEFAULT 0;
    
    PRINT '2FA column added successfully to USER_INFO table.';
END
ELSE
BEGIN
    PRINT '2FA column already exists in USER_INFO table.';
END
GO

-- Optional: Set 2FA to 1 for specific users (Admin, Super User)
-- Uncomment the lines below if you want to enable 2FA for admins by default
/*
UPDATE [dbo].[USER_INFO]
SET Require2FA = 1
WHERE User_Rights IN ('Admin', 'Super User');

PRINT 'Enabled 2FA for Admin and Super User accounts.';
*/

-- Verify the changes
SELECT TOP 5 
    User_ID, 
    Username, 
    Email, 
    User_Rights, 
    Require2FA
FROM [dbo].[USER_INFO];
GO
