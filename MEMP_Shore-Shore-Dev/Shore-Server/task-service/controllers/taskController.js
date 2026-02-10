// viswa-digital-backend/task-service/controllers/taskController.js
import * as taskModel from '../models/taskModel.js';
import ExcelJS from 'exceljs';
import { taskUploadsDir } from '../utils/db.js';
import fs from 'fs';
import path from 'path';

export const getTaskStatuses = async (req, res, next) => {
    try {
        const statuses = await taskModel.getTaskStatusesFromDB();
        res.json(statuses);
    } catch (err) {
        console.error("[TaskService Controller] Error in getTaskStatuses:", err);
        next(err);
    }
};

export const getProducts = async (req, res, next) => {
    try {
        const products = await taskModel.getProductsFromDB();
        res.json(products);
    } catch (err) {
        console.error("[TaskService Controller] Error in getProducts:", err);
        next(err);
    }
};

export const getMemberTasks = async (req, res, next) => {
    const { memberId } = req.params;
    if (isNaN(parseInt(memberId))) {
        return res.status(400).json({ error: "Invalid member ID" });
    }
    try {
        const tasks = await taskModel.getTasksByMemberIdFromDB(memberId, req.query);
        res.json(tasks);
    } catch (err) {
        console.error(`[TaskService Controller] Error in getMemberTasks (ID: ${memberId}):`, err);
        next(err);
    }
};

export const getTaskAttachments = async (req, res, next) => {
    const { taskId } = req.params;
    if (isNaN(parseInt(taskId))) {
        return res.status(400).json({ error: "Invalid task ID" });
    }
    try {
        const attachments = await taskModel.getTaskAttachmentsFromDB(taskId);
        res.json(attachments);
    } catch (err) {
        console.error(`[TaskService Controller] Error in getTaskAttachments (ID: ${taskId}):`, err);
        next(err);
    }
};

export const getAllTasks = async (req, res, next) => {
    try {
        const tasks = await taskModel.getAllTasksFromDB(req.query);
        res.json(tasks);
    } catch (err) {
        console.error(`[TaskService Controller] Error in getAllTasks:`, err);
        next(err);
    }
};

export const getTaskById = async (req, res, next) => {
    const { taskId } = req.params;
     if (isNaN(parseInt(taskId))) {
        return res.status(400).json({ error: "Invalid task ID" });
    }
    try {
        const task = await taskModel.getTaskByIdFromDB(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        res.json(task);
    } catch (err) {
        console.error(`[TaskService Controller] Error in getTaskById (ID: ${taskId}):`, err);
        next(err);
    }
};

export const createTask = async (req, res, next) => {
    let uploadedFiles = req.files || [];
    try {
        const taskStatuses = await taskModel.getTaskStatusesFromDB();
        const products = await taskModel.getProductsFromDB();
        const selectedProduct = products.find(p => p.Prod_Id.toString() === req.body.taskApplication);
        const selectedStatusOption = taskStatuses.find(s => s.Task_Status_Id.toString() === req.body.taskStatus);

        const newTaskData = {
            digitalTeamId: req.body.digitalTeamId,
            memberName: req.body.Member_Name,
            task: req.body.taskDesc,
            status: selectedStatusOption?.Task_Status,
            taskStatusId: req.body.taskStatus,
            prodId: req.body.taskApplication,
            application: selectedProduct?.Prod_Name,
            manHours: req.body.taskHours,
            jiraTicket: req.body.taskJira,
            taskDate: req.body.taskDate,
            completionDate: req.body.taskCompletionDate,
        };

        const newTask = await taskModel.createTaskInDB(newTaskData);
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                const attachmentData = {
                    taskId: newTask.Task_Id,
                    filename: file.filename,
                    originalname: file.originalname,
                    mimetype: file.mimetype
                };
                await taskModel.createAttachmentInDB(attachmentData);
            }
        }
        res.status(201).json(newTask);
    } catch (err) {
        console.error('[TaskService Controller] Error in createTask:', err);
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                fs.unlinkSync(path.join(taskUploadsDir, file.filename));
            }
        }
        next(err);
    }
};

export const updateTask = async (req, res, next) => {
    const { taskId } = req.params;
    if (isNaN(parseInt(taskId))) {
        return res.status(400).json({ error: "Invalid task ID" });
    }
    let uploadedFiles = req.files || [];
    try {
        const taskStatuses = await taskModel.getTaskStatusesFromDB();
        const products = await taskModel.getProductsFromDB();

        const selectedProduct = products.find(p => p.Prod_Id.toString() === req.body.taskApplication);
        const selectedStatusOption = taskStatuses.find(s => s.Task_Status_Id.toString() === req.body.taskStatus);
        
        const updatedTaskData = {
            digitalTeamId: req.body.digitalTeamId,
            memberName: req.body.Member_Name,
            task: req.body.taskDesc,
            status: selectedStatusOption?.Task_Status,
            taskStatusId: req.body.taskStatus,
            prodId: req.body.taskApplication,
            application: selectedProduct?.Prod_Name,
            manHours: req.body.taskHours,
            jiraTicket: req.body.taskJira,
            taskDate: req.body.taskDate,
            completionDate: req.body.taskCompletionDate,
        };

        const updatedTask = await taskModel.updateTaskInDB(parseInt(taskId), updatedTaskData);
        if (!updatedTask) {
            return res.status(404).json({ error: "Update failed or task not found." });
        }
        
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                const attachmentData = {
                    taskId: updatedTask.Task_Id,
                    filename: file.filename,
                    originalname: file.originalname,
                    mimetype: file.mimetype
                };
                await taskModel.createAttachmentInDB(attachmentData);
            }
        }
        res.json(updatedTask);
    } catch (err) {
        console.error(`[TaskService Controller] Error in updateTask (ID: ${taskId}):`, err);
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                fs.unlinkSync(path.join(taskUploadsDir, file.filename));
            }
        }
        next(err);
    }
};

export const exportMemberTasks = async (req, res, next) => {
    const { memberId } = req.params;
    const { memberName } = req.query; 

    if (isNaN(parseInt(memberId))) {
        return res.status(400).json({ error: "Invalid Member ID" });
    }
    try {
        const tasksToExport = await taskModel.getTasksByMemberIdFromDB(memberId, req.query);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tasks');

        worksheet.columns = [
            { header: 'Task ID', key: 'Task_Id', width: 10 },
            { header: 'Member Name', key: 'Member_Name', width: 25 },
            { header: 'Task Description', key: 'Task', width: 50 },
            { header: 'Application', key: 'Application', width: 25 },
            { header: 'Status', key: 'Status', width: 20 },
            { header: 'Man Hours', key: 'Man_hours', width: 15, style: { numFmt: '0.00' } },
            { header: 'Jira Ticket', key: 'Jira_Ticket', width: 20 },
            { header: 'Task Date', key: 'Task_Date', width: 25, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'Start Date', key: 'Start_Date', width: 25, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'End Date', key: 'End_Date', width: 25, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'Completion Date', key: 'Completion_Date', width: 25, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
            { header: 'Completed', key: 'Iscompleted', width: 15 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        tasksToExport.forEach(task => {
            worksheet.addRow(task);
        });

        const safeMemberName = memberName ? memberName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'tasks';
        const dateStamp = new Date().toISOString().slice(0, 10);
        const fileName = `${safeMemberName}_export_${dateStamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(`[TaskService Controller] Error exporting tasks for member ${memberId}:`, err);
        next(err);
    }
};