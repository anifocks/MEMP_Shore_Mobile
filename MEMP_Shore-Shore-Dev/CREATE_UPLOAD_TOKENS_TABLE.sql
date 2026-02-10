-- Create table for template upload tokens
-- This enables secure "anywhere" uploads without requiring user login

CREATE TABLE UploadTokens (
    TokenID INT IDENTITY(1,1) PRIMARY KEY,
    Token NVARCHAR(255) UNIQUE NOT NULL,
    ShipID INT NOT NULL,
    CreatedBy INT NULL, -- UserID who generated the template
    CreatedAt DATETIME DEFAULT GETDATE(),
    ExpiresAt DATETIME NULL, -- NULL = never expires
    IsActive BIT DEFAULT 1,
    UsageCount INT DEFAULT 0,
    MaxUsageCount INT NULL, -- NULL = unlimited uses
    LastUsedAt DATETIME NULL,
    LastUsedIP NVARCHAR(100) NULL,
    Notes NVARCHAR(500) NULL,
    
    CONSTRAINT FK_UploadTokens_Ship FOREIGN KEY (ShipID) REFERENCES MEMP_Ships(ShipID) ON DELETE CASCADE
    -- Optional: Add user tracking if USER_INFO table exists
    -- CONSTRAINT FK_UploadTokens_User FOREIGN KEY (CreatedBy) REFERENCES USER_INFO(User_ID) ON DELETE SET NULL
);

CREATE INDEX IX_UploadTokens_Token ON UploadTokens(Token);
CREATE INDEX IX_UploadTokens_ShipID ON UploadTokens(ShipID);
CREATE INDEX IX_UploadTokens_IsActive ON UploadTokens(IsActive);

-- Stored Procedure: Generate Upload Token
GO
CREATE OR ALTER PROCEDURE GenerateUploadToken
    @ShipID INT,
    @CreatedBy INT = NULL,
    @ExpiresInDays INT = 365,
    @MaxUsageCount INT = NULL,
    @Notes NVARCHAR(500) = NULL
AS
BEGIN
    DECLARE @Token NVARCHAR(255);
    DECLARE @ExpiresAt DATETIME;
    
    -- Generate unique token (UUID-based)
    SET @Token = REPLACE(CAST(NEWID() AS NVARCHAR(50)), '-', '') + '_' + CAST(@ShipID AS NVARCHAR(10));
    
    -- Set expiration date
    IF @ExpiresInDays IS NOT NULL
        SET @ExpiresAt = DATEADD(DAY, @ExpiresInDays, GETDATE());
    
    -- Insert token
    INSERT INTO UploadTokens (Token, ShipID, CreatedBy, ExpiresAt, MaxUsageCount, Notes)
    VALUES (@Token, @ShipID, @CreatedBy, @ExpiresAt, @MaxUsageCount, @Notes);
    
    -- Return the token
    SELECT 
        Token,
        ShipID,
        ExpiresAt,
        MaxUsageCount,
        'Token generated successfully' AS Message
    FROM UploadTokens
    WHERE Token = @Token;
END;
GO

-- Stored Procedure: Validate Upload Token
CREATE OR ALTER PROCEDURE ValidateUploadToken
    @Token NVARCHAR(255),
    @IPAddress NVARCHAR(100) = NULL
AS
BEGIN
    DECLARE @IsValid BIT = 0;
    DECLARE @ShipID INT = NULL;
    DECLARE @Message NVARCHAR(255);
    
    -- Check if token exists and is active
    SELECT 
        @IsValid = CASE 
            WHEN IsActive = 1 
                AND (ExpiresAt IS NULL OR ExpiresAt > GETDATE())
                AND (MaxUsageCount IS NULL OR UsageCount < MaxUsageCount)
            THEN 1 
            ELSE 0 
        END,
        @ShipID = ShipID,
        @Message = CASE 
            WHEN IsActive = 0 THEN 'Token has been revoked'
            WHEN ExpiresAt IS NOT NULL AND ExpiresAt <= GETDATE() THEN 'Token has expired'
            WHEN MaxUsageCount IS NOT NULL AND UsageCount >= MaxUsageCount THEN 'Token usage limit reached'
            WHEN IsActive = 1 THEN 'Token is valid'
            ELSE 'Token not found'
        END
    FROM UploadTokens
    WHERE Token = @Token;
    
    -- If token not found
    IF @ShipID IS NULL
    BEGIN
        SET @IsValid = 0;
        SET @Message = 'Invalid token';
    END
    
    -- Update usage if valid
    IF @IsValid = 1
    BEGIN
        UPDATE UploadTokens
        SET UsageCount = UsageCount + 1,
            LastUsedAt = GETDATE(),
            LastUsedIP = @IPAddress
        WHERE Token = @Token;
    END
    
    -- Return validation result
    SELECT 
        @IsValid AS IsValid,
        @ShipID AS ShipID,
        @Message AS Message;
END;
GO

-- Stored Procedure: Revoke Token
CREATE OR ALTER PROCEDURE RevokeUploadToken
    @Token NVARCHAR(255)
AS
BEGIN
    UPDATE UploadTokens
    SET IsActive = 0
    WHERE Token = @Token;
    
    SELECT 
        Token,
        'Token revoked successfully' AS Message
    FROM UploadTokens
    WHERE Token = @Token;
END;
GO

-- Stored Procedure: Get Tokens for Ship
CREATE OR ALTER PROCEDURE GetUploadTokensByShip
    @ShipID INT
AS
BEGIN
    SELECT 
        TokenID,
        Token,
        ShipID,
        CreatedBy,
        CreatedAt,
        ExpiresAt,
        IsActive,
        UsageCount,
        MaxUsageCount,
        LastUsedAt,
        LastUsedIP,
        Notes
    FROM UploadTokens
    WHERE ShipID = @ShipID
    ORDER BY CreatedAt DESC;
END;
GO

PRINT 'Upload Tokens table and procedures created successfully!';
