// viswa-digital-backend/task-service/models/taskModel.js
import sql from 'mssql';
import { executeQuery } from '../utils/db.js';

export const getTaskStatusesFromDB = async () => {
    const query = "SELECT Task_Status_Id, Task_Status FROM dbo.Digital_Team_Task_Status WHERE Isactive=1 ORDER BY Task_Status_Id";
    const result = await executeQuery(query, [], "GetTaskStatuses");
    return result.recordset;
};

export const getProductsFromDB = async () => {
    const query = "SELECT Prod_Id, Prod_Name FROM dbo.Viswa_Digital_products WHERE IsActive=1 ORDER BY Prod_Name";
    const result = await executeQuery(query, [], "GetProducts");
    return result.recordset;
};

const determineCompletionStatus = (completionDate) => {
    return completionDate ? 'Yes' : 'No';
};

export const getTasksByMemberIdFromDB = async (memberId, filters) => {
    const { filterStartDate, filterEndDate, filterCompleted } = filters || {};
    let query = `
        SELECT
            a.Task_Id,
            b.Member_Name,
            a.Task,
            d.Prod_Name AS Application,
            c.Task_Status AS Status,
            a.Task_Status_Id,
            a.Prod_Id,
            a.Man_hours,
            a.Jira_Ticket,
            a.Task_Date,
            a.Completion_Date,
            a.Start_Date,
            a.End_Date,
            CASE WHEN a.Task_Status_Id IN (3, 4, 5) THEN 'Yes' ELSE 'No' END AS Iscompleted,
            -- NEW: Count attachments for each task
            (SELECT COUNT(*) FROM dbo.Digital_Team_Task_Attachments WHERE Task_Id = a.Task_Id) AS AttachmentCount
        FROM dbo.Digital_Team_Task a
        LEFT JOIN dbo.Viswa_Digital_Team b ON a.Digital_Team_Id = b.Team_Id
        LEFT JOIN dbo.Digital_Team_Task_Status c ON a.Task_Status_Id = c.Task_Status_Id
        LEFT JOIN dbo.Viswa_Digital_products d ON a.Prod_Id = d.Prod_Id
        WHERE a.Digital_Team_Id = @memberId`;

    const inputs = [{ name: 'memberId', type: sql.Int, value: parseInt(memberId) }];
    if (filterStartDate) {
        query += " AND a.Task_Date >= @filterStartDate";
        inputs.push({ name: 'filterStartDate', type: sql.Date, value: new Date(filterStartDate) });
    }
    if (filterEndDate) {
        const endDateObj = new Date(filterEndDate);
        endDateObj.setHours(23, 59, 59, 999);
        query += " AND a.Task_Date <= @filterEndDate";
        inputs.push({ name: 'filterEndDate', type: sql.DateTime, value: endDateObj });
    }
    if (filterCompleted && filterCompleted.toLowerCase() !== 'all') {
        if (filterCompleted.toLowerCase() === 'yes') {
            query += ` AND a.Task_Status_Id IN (3, 4, 5)`;
        } else if (filterCompleted.toLowerCase() === 'no') {
            query += ` AND a.Task_Status_Id NOT IN (3, 4, 5)`;
        }
    }
    query += " ORDER BY a.Task_Id DESC;";
    const result = await executeQuery(query, inputs, "GetTasksByMemberId");
    return result.recordset;
};


export const getTaskByIdFromDB = async (taskId) => {
    const query = `
        SELECT *,
               CASE WHEN Task_Status_Id IN (3, 4, 5) THEN 'Yes' ELSE 'No' END AS Iscompleted
        FROM dbo.Digital_Team_Task
        WHERE Task_Id = @taskId;`;
    const inputs = [{ name: 'taskId', type: sql.Int, value: taskId }];
    const result = await executeQuery(query, inputs, "GetTaskById");
    return result.recordset[0];
};

export const createTaskInDB = async (taskData) => {
    const {
        digitalTeamId, memberName, task, status, taskStatusId, prodId, application, manHours,
        jiraTicket, taskDate, completionDate
    } = taskData;

    const isCompleted = [3, 4, 5].includes(parseInt(taskStatusId)) ? 'Yes' : 'No';
    let finalCompletionDate = completionDate ? new Date(completionDate) : null;
    let finalEndDate = null;
    if (isCompleted === 'Yes' && !finalCompletionDate) {
        finalCompletionDate = new Date();
    } else if (isCompleted === 'No') {
        finalCompletionDate = null;
    }
    if (isCompleted === 'Yes') {
        finalEndDate = finalCompletionDate;
    }

    const query = `
        INSERT INTO dbo.Digital_Team_Task (
            Digital_Team_Id, Member_Name, Task, Status, Task_Status_Id, Prod_Id, Application, Man_hours,
            Jira_Ticket, Task_Date, Completion_Date, Iscompleted, Start_Date, End_Date
        )
        OUTPUT Inserted.*
        VALUES (
            @digitalTeamId, @memberName, @task, @status, @taskStatusId, @prodId, @application, @manHours,
            @jiraTicket, @taskDate, @completionDate, @isCompleted, @startDate, @endDate
        );
    `;

    const inputs = [
        { name: 'digitalTeamId', type: sql.Int, value: digitalTeamId },
        { name: 'memberName', type: sql.NVarChar, value: memberName || null },
        { name: 'task', type: sql.NVarChar, value: task },
        { name: 'status', type: sql.NVarChar, value: status || null },
        { name: 'taskStatusId', type: sql.Int, value: taskStatusId },
        { name: 'prodId', type: sql.Int, value: prodId || null },
        { name: 'application', type: sql.NVarChar, value: application || null },
        { name: 'manHours', type: sql.Decimal(10, 2), value: manHours || null },
        { name: 'jiraTicket', type: sql.NVarChar, value: jiraTicket || null },
        { name: 'taskDate', type: sql.DateTime, value: taskDate ? new Date(taskDate) : new Date() },
        { name: 'completionDate', type: sql.DateTime, value: finalCompletionDate },
        { name: 'isCompleted', type: sql.NVarChar, value: isCompleted },
        { name: 'startDate', type: sql.DateTime, value: taskDate ? new Date(taskDate) : new Date() },
        { name: 'endDate', type: sql.DateTime, value: finalEndDate },
    ];

    const result = await executeQuery(query, inputs, "CreateTask");
    return result.recordset[0];
};

export const updateTaskInDB = async (taskId, taskData) => {
    const {
        digitalTeamId, memberName, task, status, taskStatusId, prodId, application, manHours,
        jiraTicket, taskDate, completionDate
    } = taskData;

    const isCompleted = [3, 4, 5].includes(parseInt(taskStatusId)) ? 'Yes' : 'No';
    let finalCompletionDate = completionDate ? new Date(completionDate) : null;
    let finalEndDate = null;
    if (isCompleted === 'Yes' && !finalCompletionDate) {
        finalCompletionDate = new Date();
    } else if (isCompleted === 'No') {
        finalCompletionDate = null;
    }
    if (isCompleted === 'Yes') {
        finalEndDate = finalCompletionDate;
    }

    const query = `
        UPDATE dbo.Digital_Team_Task SET
            Digital_Team_Id = @digitalTeamId,
            Member_Name = @memberName,
            Task = @task,
            Status = @status,
            Task_Status_Id = @taskStatusId,
            Prod_Id = @prodId,
            Application = @application,
            Man_hours = @manHours,
            Jira_Ticket = @jiraTicket,
            Task_Date = @taskDate,
            Completion_Date = @completionDate,
            Iscompleted = @isCompleted,
            Start_Date = @startDate,
            End_Date = @endDate
        OUTPUT Inserted.*, CASE WHEN Inserted.Task_Status_Id IN (3, 4, 5) THEN 'Yes' ELSE 'No' END AS IscompletedCalculated
        WHERE Task_Id = @taskId;
    `;

    const inputs = [
        { name: 'taskId', type: sql.Int, value: taskId },
        { name: 'digitalTeamId', type: sql.Int, value: digitalTeamId },
        { name: 'memberName', type: sql.NVarChar, value: memberName || null },
        { name: 'task', type: sql.NVarChar, value: task },
        { name: 'status', type: sql.NVarChar, value: status || null },
        { name: 'taskStatusId', type: sql.Int, value: taskStatusId },
        { name: 'prodId', type: sql.Int, value: prodId || null },
        { name: 'application', type: sql.NVarChar, value: application || null },
        { name: 'manHours', type: sql.Decimal(10, 2), value: manHours || null },
        { name: 'jiraTicket', type: sql.NVarChar, value: jiraTicket || null },
        { name: 'taskDate', type: sql.DateTime, value: taskDate ? new Date(taskDate) : new Date() },
        { name: 'completionDate', type: sql.DateTime, value: finalCompletionDate },
        { name: 'isCompleted', type: sql.NVarChar, value: isCompleted },
        { name: 'startDate', type: sql.DateTime, value: taskDate ? new Date(taskDate) : new Date() },
        { name: 'endDate', type: sql.DateTime, value: finalEndDate },
    ];

    const result = await executeQuery(query, inputs, "UpdateTask");
    const record = result.recordset[0];
    if (record) {
        record.Iscompleted = record.IscompletedCalculated;
        delete record.IscompletedCalculated;
    }
    return record;
};

// NEW: Function to create a task attachment in the database
export const createAttachmentInDB = async (attachmentData) => {
    const { taskId, filename, originalname, mimetype } = attachmentData;
    const query = `
        INSERT INTO dbo.Digital_Team_Task_Attachments (
            Task_Id, Filename, OriginalName, MimeType
        )
        OUTPUT Inserted.*
        VALUES (
            @taskId, @filename, @originalname, @mimetype
        );
    `;
    const inputs = [
        { name: 'taskId', type: sql.Int, value: taskId },
        { name: 'filename', type: sql.NVarChar, value: filename },
        { name: 'originalname', type: sql.NVarChar, value: originalname },
        { name: 'mimetype', type: sql.NVarChar, value: mimetype || null }
    ];
    const result = await executeQuery(query, inputs, "CreateAttachment");
    return result.recordset[0];
};

export const getTaskAttachmentsFromDB = async (taskId) => {
    const query = `
        SELECT Attachment_Id, Filename, OriginalName, MimeType, UploadDate
        FROM dbo.Digital_Team_Task_Attachments
        WHERE Task_Id = @taskId
        ORDER BY UploadDate DESC;
    `;
    const inputs = [{ name: 'taskId', type: sql.Int, value: taskId }];
    const result = await executeQuery(query, inputs, "GetTaskAttachments");
    return result.recordset;
};