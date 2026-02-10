// src/pages/TeamMemberPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TeamMemberPage.css';
import { FaPlus, FaEdit, FaSort, FaSortUp, FaSortDown, FaTimes, FaSave, FaCalendarAlt, FaUndo, FaFileExcel, FaFileUpload, FaFileAlt, FaFileImage, FaDownload, FaPaperclip, FaEye, FaExpand, FaCompress } from 'react-icons/fa';
import RotatingBackground from '../components/RotatingBackground.jsx'; // Added import

// A modal component for viewing file attachments with a list and preview
const AttachmentModal = ({ isOpen, onClose, attachments }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const previewRef = useRef(null);

    // No longer auto-selects the first file. Selected file is set only on click.
    useEffect(() => {
        if (!isOpen) {
            setSelectedFile(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // UPDATED: Include Word and Excel in the previewable list for Google Docs Viewer
    const isPreviewable = (mimeType) => {
        // A list of file types that can be previewed directly in an iframe/browser.
        return mimeType.startsWith('image/') ||
               mimeType === 'application/pdf' ||
               mimeType === 'text/plain' ||
               mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // .docx
               mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; // .xlsx
    };
    
    // UPDATED: Conditional URL for preview
    const previewUrl = selectedFile && isPreviewable(selectedFile.MimeType)
        ? (selectedFile.MimeType.startsWith('image/') || selectedFile.MimeType === 'application/pdf' || selectedFile.MimeType === 'text/plain'
            ? `/api/tasks/task_attachments/${selectedFile.Filename}`
            : `https://docs.google.com/gview?url=${encodeURIComponent(`${window.location.origin}/api/tasks/task_attachments/${selectedFile.Filename}`)}&embedded=true`)
        : null;

    const downloadUrl = `/api/tasks/task_attachments/${selectedFile?.Filename}`;
    const isImage = selectedFile?.MimeType.startsWith('image/');
    const canPreview = selectedFile && isPreviewable(selectedFile.MimeType);

    return (
        <div className="task-modal-overlay">
            <div className={`task-modal-content attachments-modal-content ${isMaximized ? 'maximized' : ''}`}>
                <span className="task-modal-close-btn" onClick={onClose}>&times;</span>
                <div className="attachments-modal-container">
                    <div className="attachments-list-pane">
                        <h3>Attachments</h3>
                        <table className="attachment-table">
                            <thead>
                                <tr>
                                    <th>S. No</th>
                                    <th>File name</th>
                                    <th>Preview</th>
                                    <th>Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attachments.map((file, index) => (
                                    <tr key={index} className={selectedFile?.Filename === file.Filename ? 'selected' : ''}>
                                        <td>{index + 1}</td>
                                        <td>{file.OriginalName}</td>
                                        <td>
                                            <button className="view-button" onClick={() => setSelectedFile(file)} title="View Preview">
                                                <FaEye />
                                            </button>
                                        </td>
                                        <td>
                                            <a href={`/api/tasks/task_attachments/${file.Filename}`} target="_blank" rel="noopener noreferrer" className="download-button" title="Download Document">
                                                <FaDownload />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="attachments-preview-pane">
                        {selectedFile ? (
                            <>
                                <div className="preview-header">
                                    <h4 className="file-title">{selectedFile.OriginalName}</h4>
                                    <div className="preview-actions">
                                        <button className="maximize-button" onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? 'Minimize' : 'Maximize'}>
                                            {isMaximized ? <FaCompress /> : <FaExpand />}
                                        </button>
                                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="download-button-large" title="Download Document">
                                            <FaDownload /> Download
                                        </a>
                                    </div>
                                </div>
                                <div className="preview-content" ref={previewRef}>
                                    {canPreview ? (
                                        isImage || selectedFile.MimeType === 'application/pdf' || selectedFile.MimeType === 'text/plain' ? (
                                            <iframe src={previewUrl} title="Attachment Preview" width="100%" height="100%" style={{ border: 'none' }}></iframe>
                                        ) : (
                                            <iframe src={previewUrl} title="Attachment Preview" width="100%" height="100%" style={{ border: 'none' }}></iframe>
                                        )
                                    ) : (
                                        <div className="no-preview-available">
                                            <h4>Preview Not Possible</h4>
                                            <p>This file type cannot be displayed in the browser. Please click 'Download' to view the content.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="no-file-selected">Select a file from the list to preview.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TaskForm = ({ initialData, onSubmit, onCancel, isEditMode, isSubmitting, formError, products, taskStatuses }) => {
  const [formData, setFormData] = useState(initialData);
  const [attachments, setAttachments] = useState([]); // Use an array for multiple files

  useEffect(() => { setFormData(initialData); }, [initialData]);
  const handleInputChange = (e) => { const { id, value } = e.target; setFormData(prev => ({ ...prev, [id]: value })); };
  const handleFileChange = (e) => { setAttachments(Array.from(e.target.files)); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      dataToSend.append(key, formData[key]);
    });
    // Append all selected files
    attachments.forEach(file => {
      dataToSend.append('attachments', file);
    });
    onSubmit(dataToSend);
  };
  return (
    <form onSubmit={handleSubmit} className={isEditMode !== 'modal' ? "inline-task-form" : "modal-task-form"}>
      {formError && <p className="form-error-message">{formError}</p>}
      <div className="form-group">
        <label htmlFor="taskDesc">Task Description:</label>
        <textarea id="taskDesc" name="taskDesc" className="form-control" rows="3" required value={formData.taskDesc} onChange={handleInputChange} disabled={isSubmitting}></textarea>
      </div>
      <div className="form-row">
        <div className="form-col">
          <div className="form-group">
            <label htmlFor="taskApplication">Application:</label>
            <select id="taskApplication" name="taskApplication" className="form-control" value={formData.taskApplication} onChange={handleInputChange} disabled={isSubmitting}>
              <option value="">Select Application</option>
              {products.map(p => <option key={p.Prod_Id} value={p.Prod_Id.toString()}>{p.Prod_Name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-col">
          <div className="form-group">
            <label htmlFor="taskStatus">Status:</label>
            <select id="taskStatus" name="taskStatus" className="form-control" required value={formData.taskStatus} onChange={handleInputChange} disabled={isSubmitting}>
              <option value="">Select Status</option>
              {taskStatuses.map(s => <option key={s.Task_Status_Id} value={s.Task_Status_Id.toString()}>{s.Task_Status}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-col">
          <div className="form-group">
            <label htmlFor="taskHours">Man Hours:</label>
            <input type="number" step="0.01" min="0" id="taskHours" name="taskHours" className="form-control" placeholder="e.g. 1.5" value={formData.taskHours} onChange={handleInputChange} disabled={isSubmitting} />
          </div>
        </div>
        <div className="form-col">
          <div className="form-group">
            <label htmlFor="taskJira">Jira Ticket:</label>
            <input type="text" id="taskJira" name="taskJira" className="form-control" placeholder="e.g. VDS-2702" value={formData.taskJira} onChange={handleInputChange} disabled={isSubmitting} />
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-col">
          <div className="form-group">
            <label htmlFor="taskDate">Task Date:</label>
            <input type="datetime-local" id="taskDate" name="taskDate" className="form-control" value={formData.taskDate} onChange={handleInputChange} disabled={isSubmitting} />
          </div>
        </div>
        <div className="form-col">
          <div className="form-group">
            <label htmlFor="taskCompletionDate">Completion Date:</label>
            <input type="datetime-local" id="taskCompletionDate" name="taskCompletionDate" className="form-control" value={formData.taskCompletionDate} onChange={handleInputChange} disabled={isSubmitting} />
          </div>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="attachments">Upload Attachments:</label>
        <input type="file" id="attachments" name="attachments" className="form-control" onChange={handleFileChange} multiple disabled={isSubmitting} />
      </div>
      <div className="form-actions">
        <button type="submit" className="task-form-submit-btn" disabled={isSubmitting}>
          <FaSave /> {isSubmitting ? (initialData.isEditModeOp ? 'Updating...' : 'Saving...') : (initialData.isEditModeOp ? 'Update Task' : 'Save Task')}
        </button>
        <button type="button" className="task-form-cancel-btn" onClick={onCancel} disabled={isSubmitting}>
          <FaTimes /> Cancel
        </button>
      </div>
    </form>
  );
};

const TeamMemberPage = () => {
  const { memberId } = useParams();
  const [memberDetails, setMemberDetails] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingMember, setLoadingMember] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [pageError, setPageError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const initialFormState = useMemo(() => ({ taskDesc: '', taskApplication: '', taskStatus: '', taskHours: '', taskJira: '', taskDate: '', taskCompletionDate: '', isEditModeOp: false, }), []);
  const [taskFormData, setTaskFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'Task_Date', direction: 'descending' });
  const [filterCompleted, setFilterCompleted] = useState('No');
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [editingUIMode, setEditingUIMode] = useState('modal');
  const [inlineEditTaskId, setInlineEditTaskId] = useState(null);
  const [showInlineAddForm, setShowInlineAddForm] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [currentAttachments, setCurrentAttachments] = useState([]);

  // States for introduction editing
  const [isEditingIntroduction, setIsEditingIntroduction] = useState(false);
  const [editableIntroduction, setEditableIntroduction] = useState('');
  const [introEditError, setIntroEditError] = useState('');
  const INTRO_CHAR_LIMIT = 500;

  // NEW: States for image editing
  const [isEditing, setIsEditing] = useState(false);
  const [newImageFile, setNewImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');
  const fileInputRef = useRef(null);

  const formatDateForInput = (dateString) => { if (!dateString) return ''; try { const date = new Date(dateString); if (isNaN(date.getTime())) return ''; return date.toISOString().slice(0, 16); } catch (e) { console.error("Error formatting date:", dateString, e); return ''; } };
  const resetFormAndStates = useCallback(() => { setTaskFormData(initialFormState); setFormError(''); setCurrentTask(null); setIsModalOpen(false); setInlineEditTaskId(null); setShowInlineAddForm(false); setIsSubmitting(false); }, [initialFormState]);

  useEffect(() => {
    const fetchDropdownData = async () => {
        setLoadingDropdowns(true);
        try {
            const [statusesRes, productsRes] = await Promise.all([
                fetch('/api/tasks/statuses'),
                fetch('/api/tasks/products')
            ]);
            if (!statusesRes.ok) throw new Error(`Failed to fetch task statuses (Status: ${statusesRes.status})`);
            setTaskStatuses(await statusesRes.json());
            if (!productsRes.ok) throw new Error(`Failed to fetch products (Status: ${productsRes.status})`);
            setProducts(await productsRes.json());
            setPageError(prev => prev.replace(/Failed to fetch (task statuses|products)/gi, '').trim());
        } catch (err) {
            console.error("Error fetching dropdown data:", err); setPageError(prev => `${prev}\n${err.message}`.trim());
        } finally {
            setLoadingDropdowns(false);
        }
    };
    fetchDropdownData();
  }, []);

  useEffect(() => {
      if (!memberId) { setPageError("No Member ID provided in URL."); setLoadingMember(false); return; }
      const fetchMemberDetails = async () => {
          setLoadingMember(true);
          setPageError('');
          try {
              const memberRes = await fetch(`/api/team/${memberId}`);
              if (!memberRes.ok) {
                  const errorData = await memberRes.json().catch(() => ({}));
                  throw new Error(errorData.error || `Failed to fetch member details (Status: ${memberRes.status})`);
              }
              const data = await memberRes.json();
              setMemberDetails(data);
              setEditableIntroduction(data.Introduction || '');
            } catch (err) {
                console.error("Error fetching member details:", err);
                setPageError(prev => `${prev}\n${err.message}`.trim());
            } finally {
                setLoadingMember(false);
            }
        };
        fetchMemberDetails();
    }, [memberId]);

  const fetchTasks = useCallback(async () => {
    if (!memberId) return;
    setLoadingTasks(true);
    let url = `/api/tasks/bymember/${memberId}`;
    const params = new URLSearchParams();
    params.append('filterCompleted', filterCompleted);
    if (selectedStartDate) params.append('filterStartDate', new Date(selectedStartDate).toISOString());
    if (selectedEndDate) {
        const endDateObj = new Date(selectedEndDate);
        endDateObj.setHours(23, 59, 59, 999);
        params.append('filterEndDate', endDateObj.toISOString());
    }
    url += `?${params.toString()}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch tasks (Status: ${response.status})`);
      }
      setTasks(await response.json());
      setPageError(prev => prev.replace(/Failed to load tasks:.*?(\n|$)/gi, '').trim());
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setPageError(prev => `${prev}\nFailed to load tasks: ${err.message}`.trim());
    } finally {
      setLoadingTasks(false);
    }
  }, [memberId, filterCompleted, selectedStartDate, selectedEndDate]);

  useEffect(() => { if (memberDetails) { fetchTasks(); } }, [memberDetails, fetchTasks]);

  const handleApplyDateFilter = () => { fetchTasks(); };
  const handleResetDateFilter = () => { setSelectedStartDate(''); setSelectedEndDate(''); setFilterCompleted('No');};

  const prepareFormForAdd = () => {
      resetFormAndStates();
      const defaultStatusId = taskStatuses.find(s => s.Task_Status?.toLowerCase() === 'new')?.Task_Status_Id.toString() || (taskStatuses.length > 0 ? taskStatuses[0].Task_Status_Id.toString() : '');
      setTaskFormData({ ...initialFormState, taskDate: formatDateForInput(new Date().toISOString()), taskStatus: defaultStatusId, isEditModeOp: false, });
      setFormError('');
      if (editingUIMode === 'modal') { setIsModalOpen(true); } else { setInlineEditTaskId(null); setShowInlineAddForm(true); }
  };
  const prepareFormForEdit = (taskToEdit) => {
      resetFormAndStates();
      setCurrentTask(taskToEdit);
      const product = products.find(p => p.Prod_Name === taskToEdit.Application || p.Prod_Id === taskToEdit.Prod_Id);
      const status = taskStatuses.find(s => s.Task_Status === taskToEdit.Status || s.Task_Status_Id === taskToEdit.Task_Status_Id);
      setTaskFormData({
          taskDesc: taskToEdit.Task || '',
          taskApplication: product ? product.Prod_Id.toString() : (taskToEdit.Prod_Id ? taskToEdit.Prod_Id.toString() : ''),
          taskStatus: status ? status.Task_Status_Id.toString() : (taskToEdit.Task_Status_Id ? taskToEdit.Task_Status_Id.toString() : ''),
          taskHours: taskToEdit.Man_hours != null ? parseFloat(taskToEdit.Man_hours).toFixed(2) : '',
          taskJira: taskToEdit.Jira_Ticket || '',
          taskDate: formatDateForInput(taskToEdit.Task_Date),
          taskCompletionDate: formatDateForInput(taskToEdit.Completion_Date),
          isEditModeOp: true,
        });
        setFormError('');
        if (editingUIMode === 'modal') { setIsModalOpen(true); } else { setShowInlineAddForm(false); setInlineEditTaskId(taskToEdit.Task_Id); }
    };

  const handleCancelForm = () => { resetFormAndStates(); };

  const handleFormSubmit = async (submittedFormData) => {
      setFormError('');
      setIsSubmitting(true);
      const taskDesc = submittedFormData.get('taskDesc');
      const taskStatus = submittedFormData.get('taskStatus');
      if (!taskDesc.trim() || !taskStatus) { setFormError('Task Description and Status are required.'); setIsSubmitting(false); return; }
      
      const isEditingExistingTask = submittedFormData.get('isEditModeOp') === 'true';
      const taskIdToUpdate = isEditingExistingTask ? (currentTask?.Task_Id || inlineEditTaskId) : null;

      const url = isEditingExistingTask && taskIdToUpdate ? `/api/tasks/${taskIdToUpdate}` : '/api/tasks';
      const method = isEditingExistingTask && taskIdToUpdate ? 'PUT' : 'POST';

      submittedFormData.append('digitalTeamId', memberId);
      if (memberDetails && memberDetails.Member_Name) {
        submittedFormData.append('Member_Name', memberDetails.Member_Name);
      }
      
      try {
          const response = await fetch(url, {
              method: method,
              body: submittedFormData,
          });
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Failed to ${isEditingExistingTask ? 'update' : 'add'} task.`);
          }
          resetFormAndStates();
          fetchTasks();
      } catch (err) {
          console.error(`Error ${isEditingExistingTask ? 'updating' : 'adding'} task:`, err); setFormError(err.message);
      } finally {
          setIsSubmitting(false);
      }
    };

    const handleViewAttachment = async (task) => {
        try {
            const response = await fetch(`/api/tasks/${task.Task_Id}/attachments`);
            if (!response.ok) {
                throw new Error('Failed to fetch attachments.');
            }
            const attachments = await response.json();
            if (attachments.length > 0) {
                setCurrentAttachments(attachments);
                setAttachmentModalOpen(true);
            } else {
                alert("No attachments found for this task.");
            }
        } catch (error) {
            console.error("Error fetching attachments:", error);
            alert("Could not load attachments.");
        }
    };

    const handleCloseAttachmentModal = () => {
        setAttachmentModalOpen(false);
        setCurrentAttachments([]);
    };

  const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } else if (sortConfig.key === key && sortConfig.direction === 'descending') { direction = 'ascending';} setSortConfig({ key, direction }); };
  const getSortIcon = (key) => { if (sortConfig.key !== key) return <FaSort style={{ opacity: 0.4 }}/>; if (sortConfig.direction === 'ascending') return <FaSortUp />; return <FaSortDown />; };
  const displayedTasks = useMemo(() => { let sortableItems = [...tasks]; if (sortConfig.key) { sortableItems.sort((a, b) => { let valA = a[sortConfig.key] ?? a[sortConfig.key.replace(/\s/g, '')]; let valB = b[sortConfig.key] ?? b[sortConfig.key.replace(/\s/g, '')]; if (['Task Date', 'Start Date', 'End Date', 'Completion Date', 'Task_Date', 'Start_Date', 'End_Date', 'Completion_Date'].includes(sortConfig.key)) { valA = valA ? new Date(valA).getTime() : (sortConfig.direction === 'ascending' ? Infinity : -Infinity); valB = valB ? new Date(valB).getTime() : (sortConfig.direction === 'ascending' ? Infinity : -Infinity); } else if (sortConfig.key === 'Man Hours' || sortConfig.key === 'Man_hours') { valA = valA != null ? parseFloat(valA) : (sortConfig.direction === 'ascending' ? Infinity : -Infinity); valB = valB != null ? parseFloat(valB) : (sortConfig.direction === 'ascending' ? Infinity : -Infinity); } else if (typeof valA === 'string' && typeof valB === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }  else { if (valA == null && valB != null) return sortConfig.direction === 'ascending' ? 1 : -1; if (valA != null && valB == null) return sortConfig.direction === 'ascending' ? -1 : 1; if (valA == null && valB == null) return 0; } if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; }); } return sortableItems; }, [tasks, sortConfig]);

  const handleExportToExcel = () => {
      if (!memberId || !memberDetails) {
          setPageError("Cannot export: Member details not available."); return;
      }
      const params = new URLSearchParams();
      params.append('filterCompleted', filterCompleted);
      if (selectedStartDate) params.append('filterStartDate', new Date(selectedStartDate).toISOString());
      if (selectedEndDate) {
          const endDateObj = new Date(selectedEndDate);
          endDateObj.setHours(23, 59, 59, 999);
          params.append('filterEndDate', endDateObj.toISOString());
      }
      params.append('memberName', memberDetails.Member_Name);
      const exportUrl = `/api/tasks/bymember/${memberId}/export?${params.toString()}`;
      window.open(exportUrl, '_blank');
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    const formData = new FormData();

    if (newImageFile) {
        formData.append('memberImage', newImageFile);
    }
    formData.append('introduction', editableIntroduction);

    try {
        const response = await fetch(`/api/team/${memberId}`, {
            method: 'PUT',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update member');
        }

        const result = await response.json();
        setMemberDetails(result.data);
        setIsEditing(false);

    } catch (err) {
        console.error("Error saving changes:", err);
    } finally {
        setIsSubmitting(false);
    }
};

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            setImageUploadError('Please select an image file.');
            setNewImageFile(null);
            setImagePreviewUrl('');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setImageUploadError('Image size exceeds 5MB limit.');
            setNewImageFile(null);
            setImagePreviewUrl('');
            return;
        }
        setNewImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
        setImageUploadError('');
    } else {
        setNewImageFile(null);
        setImagePreviewUrl('');
        setImageUploadError('');
    }
  };

  const handleIntroChange = (e) => {
    if (e.target.value.length <= INTRO_CHAR_LIMIT) {
        setEditableIntroduction(e.target.value);
        setIntroEditError('');
    } else {
        setIntroEditError(`Character limit of ${INTRO_CHAR_LIMIT} exceeded.`);
    }
};

  const isPageLoading = loadingMember || loadingDropdowns;
  if (isPageLoading) { return <div className="tasks-loading-state"><div className="tasks-spinner"></div><p>Loading member page...</p></div>; }
  if (pageError && !memberDetails) { return <div className="tasks-error-message"><p>{pageError.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p></div>; }
  if (!memberDetails && !loadingMember) { return <div className="tasks-error-message"><p>Member details could not be loaded. {pageError}</p></div>; }

  return (
    <RotatingBackground className="member-page-background">
        <div className="member-page-container">
            <header className="member-header">
                {memberDetails && (
                <>
                    <div className="member-image-wrapper">
                        <img
                            id="member-image-detail"
                            src={imagePreviewUrl || (memberDetails.ImageFilename ? `/api/team/member_images/${memberDetails.ImageFilename}` : "/member_images/default-member.png")}
                            alt={memberDetails.Member_Name}
                            className="member-image-details"
                            onError={(e) => { e.target.onerror = null; e.target.src = "/member_images/default-member.png"; }}
                        />
                        {!isEditing && (
                            <button className="edit-image-overlay-btn" onClick={() => setIsEditing(true)} title="Edit Image">
                                <FaEdit />
                            </button>
                        )}
                    </div>
                    {isEditing && (
                        <div className="image-upload-controls">
                            {imageUploadError && <p className="image-error-message">{imageUploadError}</p>}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageFileChange}
                                ref={fileInputRef}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    <div className="member-info">
                        <h1 id="member-name-detail">{memberDetails.Member_Name}</h1>
                        <p id="member-role-detail">Role: {memberDetails.Role}</p>
                        <div className="member-introduction-area">
                            {isEditingIntroduction ? (
                            <>
                                {introEditError && <p className="intro-error-message">{introEditError}</p>}
                                <textarea
                                id="member-intro-textarea"
                                className="member-intro-textarea"
                                value={editableIntroduction}
                                onChange={handleIntroChange}
                                maxLength={INTRO_CHAR_LIMIT}
                                placeholder="Enter introduction here..."
                                disabled={isSubmitting}
                                ></textarea>
                                <div className="char-count">
                                    {editableIntroduction.length} / {INTRO_CHAR_LIMIT} characters
                                </div>
                            </>
                            ) : (
                            <>
                                <div className="member-introduction-text">
                                    {memberDetails.Introduction && memberDetails.Introduction.trim() !== '' ? (
                                        memberDetails.Introduction.split('\n').map((line, index) => (
                                            <p key={index}>{line}</p>
                                        ))
                                    ) : (
                                        <p>No introduction available. Click edit to add one.</p>
                                    )}
                                </div>
                            </>
                            )}
                        </div>
                        {isEditingIntroduction && (
                            <div className="intro-edit-actions">
                                <button
                                    className="intro-save-btn"
                                    onClick={handleSaveChanges}
                                    disabled={isSubmitting || introEditError}
                                >
                                    <FaSave /> Save Changes
                                </button>
                                <button
                                    className="intro-cancel-btn"
                                    onClick={() => setIsEditingIntroduction(false)}
                                    disabled={isSubmitting}
                                >
                                    <FaTimes /> Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </>
                )}
                <div style={{ marginLeft: 'auto', alignSelf: 'flex-start', paddingTop: '5px' }}>
                <Link to="/app/team" className="global-back-link">
                    &larr; Back to Team Page
                </Link>
                </div>
            </header>
            {memberDetails && (
                <section className="task-section">
                <div className="task-section-header"> <h2>Tasks</h2> <button onClick={handleExportToExcel} className="export-excel-btn" title="Export to Excel" disabled={tasks.length === 0}> <FaFileExcel /> Export </button> </div>
                <div className="task-controls-toolbar"> <div className="toolbar-left-controls"> <div className="task-filters"> <label htmlFor="filterCompleted">filter completed</label> <select id="filterCompleted" value={filterCompleted} onChange={(e) => setFilterCompleted(e.target.value)} className="filter-dropdown" > <option value="all">All</option> <option value="Yes">Yes</option> <option value="No">No</option> </select> </div> <div className="date-range-filter"> <label htmlFor="selectedStartDate">Start Date:</label> <input type="date" id="selectedStartDate" value={selectedStartDate} onChange={(e) => setSelectedStartDate(e.target.value)} className="date-input" /> <label htmlFor="selectedEndDate">End Date:</label> <input type="date" id="selectedEndDate" value={selectedEndDate} onChange={e => setSelectedEndDate(e.target.value)} className="date-input" /> <button onClick={handleApplyDateFilter} className="date-filter-btn" title="Apply Date Filter"> <FaCalendarAlt /> Filter </button> <button onClick={handleResetDateFilter} className="date-reset-btn" title="Reset Date Filter"> <FaUndo /> Reset </button> </div> <div className="ui-mode-toggle"> <label>editmode</label> <button onClick={() => setEditingUIMode('modal')} className={`toggle-button ${editingUIMode === 'modal' ? 'active' : ''}`} > modal </button> <button onClick={() => setEditingUIMode('inline')} className={`toggle-button ${editingUIMode === 'inline' ? 'active' : ''}`} > inline </button> </div> </div> <button id="add-task-btn" className="add-task-btn" onClick={prepareFormForAdd} disabled={isSubmitting || showInlineAddForm || (inlineEditTaskId !== null)} > <FaPlus /> add new task </button> </div>
                {editingUIMode === 'inline' && showInlineAddForm && ( <div className="inline-form-container add-form-container"> <h3>Add New Task</h3> <TaskForm initialData={taskFormData} onSubmit={handleFormSubmit} onCancel={handleCancelForm} isEditMode="inline-add" isSubmitting={isSubmitting} formError={formError} products={products} taskStatuses={taskStatuses} /> </div> )}
                <div id="task-container" className="task-container">
                    {loadingTasks ? ( <div className="tasks-loading-state"><div className="tasks-spinner"></div><p>Loading tasks...</p></div> )
                    : pageError && tasks.length === 0 && !loadingMember ? (  <div className="tasks-error-message"><p>{pageError.split('\n').map((line, i) => line.includes("Failed to load tasks") ? <span key={i}>{line}<br/></span> : null )}</p></div> )
                    : tasks.length === 0 && !pageError ? ( <p style={{textAlign: 'center', padding: '20px'}}>No tasks found for the current filter criteria.</p> )
                    : (
                    <table className="task-table">
                        <thead> <tr> <th>Task Description</th> <th onClick={() => requestSort('Application')} className="sortable-header"> Application {getSortIcon('Application')} </th> <th onClick={() => requestSort('Status')} className="sortable-header"> Status {getSortIcon('Status')} </th> <th onClick={() => requestSort('Man_hours')} className="sortable-header"> Man Hours {getSortIcon('Man_hours')} </th> <th onClick={() => requestSort('Jira_Ticket')} className="sortable-header"> Jira Ticket {getSortIcon('Jira_Ticket')} </th> <th onClick={() => requestSort('Task_Date')} className="sortable-header"> Task Date {getSortIcon('Task_Date')} </th> <th onClick={() => requestSort('Start_Date')} className="sortable-header"> Start Date {getSortIcon('Start_Date')} </th> <th onClick={() => requestSort('End_Date')} className="sortable-header"> End Date {getSortIcon('End_Date')} </th> <th onClick={() => requestSort('Completion_Date')} className="sortable-header"> Completion Date {getSortIcon('Completion_Date')} </th> <th onClick={() => requestSort('Iscompleted')} className="sortable-header"> Completed {getSortIcon('Iscompleted')} </th> <th>Attachments</th> <th>Action</th> </tr> </thead>
                        <tbody>
                        {displayedTasks.map(task => (
                            inlineEditTaskId === task.Task_Id && editingUIMode === 'inline' ? ( <tr key={`${task.Task_Id}-editing`} className="inline-edit-row"> <td colSpan="12"> <TaskForm initialData={taskFormData} onSubmit={handleFormSubmit} onCancel={handleCancelForm} isEditMode="inline-edit" isSubmitting={isSubmitting} formError={formError} products={products} taskStatuses={taskStatuses} /> </td> </tr>
                            ) : (
                            <tr key={task.Task_Id}> <td style={{whiteSpace: 'pre-wrap'}}>{task.Task}</td> <td>{task.Application || 'N/A'}</td> <td className={`status-text-${task.Status?.toLowerCase().replace(/\s+/g, '-')}`}>{task.Status || 'N/A'}</td> <td>{task.Man_hours != null ? parseFloat(task.Man_hours).toFixed(2) : 'N/A'}</td> <td> {task.Jira_Ticket ? ( <a href={`https://theviswagroup.atlassian.net/browse/${task.Jira_Ticket}`} className="jira-link" target="_blank" rel="noopener noreferrer"> {task.Jira_Ticket} </a> ) : 'N/A'} </td> <td>{task.Task_Date ? new Date(task.Task_Date).toLocaleString() : 'N/A'}</td> <td>{task.Start_Date ? new Date(task.Start_Date).toLocaleString() : 'N/A'}</td> <td>{task.End_Date ? new Date(task.End_Date).toLocaleString() : 'N/A'}</td> <td>{task.Completion_Date ? new Date(task.Completion_Date).toLocaleString() : 'N/A'}</td> <td className={task.Iscompleted === 'Yes' ? 'task-status-yes' : 'task-status-no'}> {task.Iscompleted} </td> <td>
                                <div className="task-attachments">
                                    {task.AttachmentCount > 0 ? (
                                        <span onClick={() => handleViewAttachment(task)}>
                                            <FaPaperclip style={{ cursor: 'pointer' }} /> **({task.AttachmentCount})**
                                        </span>
                                    ) : 'None'}
                                </div>
                            </td> <td> <button className="edit-btn" onClick={() => prepareFormForEdit(task)} disabled={isSubmitting || showInlineAddForm || (inlineEditTaskId !== null && inlineEditTaskId !== task.Task_Id)} > <FaEdit /> Edit </button> </td> </tr>
                            )
                        ))}
                        </tbody>
                    </table>
                    )}
                </div>
                {isModalOpen && editingUIMode === 'modal' && ( <div id="task-modal" className="task-modal-overlay"> <div className="task-modal-content"> <span className="task-modal-close-btn" onClick={handleCancelForm}>&times;</span> <h2 id="modal-title-text" className="task-modal-title"> {taskFormData.isEditModeOp ? 'Edit Task' : 'Add New Task'} </h2> <TaskForm initialData={taskFormData} onSubmit={handleFormSubmit} onCancel={handleCancelForm} isEditMode="modal" isSubmitting={isSubmitting} formError={formError} products={products} taskStatuses={taskStatuses} /> </div> </div> )}
                </section>
            )}
            <AttachmentModal isOpen={attachmentModalOpen} onClose={handleCloseAttachmentModal} attachments={currentAttachments} />
        </div>
    </RotatingBackground>
  );
};

export default TeamMemberPage;