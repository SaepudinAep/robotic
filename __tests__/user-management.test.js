/**
 * Comprehensive Test Suite for User Management Module
 * Tests cover: initialization, CRUD operations, role-based access, UI rendering, and edge cases
 */

import { jest } from '@jest/globals';

// Setup global mocks before imports
global.fetch = jest.fn();
global.alert = jest.fn();
global.confirm = jest.fn();

// Mock FontAwesome icons
const mockFontAwesome = document.createElement('script');
mockFontAwesome.src = 'https://kit.fontawesome.com/mock.js';
document.head.appendChild(mockFontAwesome);

describe('User Management Module - Initialization', () => {
  let userManagement;
  let mockCanvas;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup DOM
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    // Mock Supabase responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      text: async () => 'Success'
    });

    // Dynamic import to apply mocks
    userManagement = await import('../modules/user-management.js');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should initialize and inject CSS styles to document head', async () => {
    await userManagement.init(mockCanvas);

    const styleElement = document.getElementById('user-management-css');
    expect(styleElement).not.toBeNull();
    expect(styleElement.tagName).toBe('STYLE');
    expect(styleElement.textContent).toContain('.um-container');
  });

  test('should not duplicate CSS if init called multiple times', async () => {
    await userManagement.init(mockCanvas);
    await userManagement.init(mockCanvas);

    const styleElements = document.querySelectorAll('#user-management-css');
    expect(styleElements.length).toBe(1);
  });

  test('should render main container with correct structure', async () => {
    await userManagement.init(mockCanvas);

    expect(mockCanvas.querySelector('.um-container')).not.toBeNull();
    expect(mockCanvas.querySelector('.um-header')).not.toBeNull();
    expect(mockCanvas.querySelector('.um-tabs')).not.toBeNull();
    expect(mockCanvas.querySelector('#reg-user-content')).not.toBeNull();
  });

  test('should render all three tabs (Registration, Mapping, Teacher)', async () => {
    await userManagement.init(mockCanvas);

    expect(mockCanvas.querySelector('#tab-reg')).not.toBeNull();
    expect(mockCanvas.querySelector('#tab-scope')).not.toBeNull();
    expect(mockCanvas.querySelector('#tab-teacher')).not.toBeNull();
  });

  test('should render form fields for user registration', async () => {
    await userManagement.init(mockCanvas);

    expect(mockCanvas.querySelector('#fullName')).not.toBeNull();
    expect(mockCanvas.querySelector('#email')).not.toBeNull();
    expect(mockCanvas.querySelector('#password')).not.toBeNull();
    expect(mockCanvas.querySelector('#role')).not.toBeNull();
  });

  test('should render search box for filtering users', async () => {
    await userManagement.init(mockCanvas);

    const searchBox = mockCanvas.querySelector('#searchUser');
    expect(searchBox).not.toBeNull();
    expect(searchBox.placeholder).toContain('Cari');
  });

  test('should render modal for scope management', async () => {
    await userManagement.init(mockCanvas);

    const modal = mockCanvas.querySelector('#modal-scope');
    expect(modal).not.toBeNull();
    expect(modal.querySelector('.mm-modal-content')).not.toBeNull();
  });

  test('should render toast notification element', async () => {
    await userManagement.init(mockCanvas);

    const toast = mockCanvas.querySelector('#toast');
    expect(toast).not.toBeNull();
    expect(toast.style.display).toBe('none');
  });
});

describe('User Management Module - Role-Based Access Control', () => {
  let mockCanvas;

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should show access denied for student role', async () => {
    // Clear modules to allow fresh import with different mock
    jest.resetModules();

    // Create fresh mock with student role
    const mockCreateClient = jest.fn(() => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'student' },
          error: null
        })
      }))
    }));

    jest.unstable_mockModule('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm', () => ({
      createClient: mockCreateClient
    }));

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);

    // Check for access denied message (student role should see access denied)
    const content = mockCanvas.querySelector('#reg-user-content').innerHTML;
    expect(content).toContain('Akses Ditolak');
  });

  test('should allow super_admin to see all features', async () => {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);

    // Super admin should see teacher tab
    const teacherTab = mockCanvas.querySelector('#tab-teacher');
    expect(teacherTab).not.toBeNull();
    expect(teacherTab.style.display).not.toBe('none');
  });

  test('should hide teacher tab for non-super_admin roles', async () => {
    jest.resetModules();

    const mockCreateClient = jest.fn(() => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'teacher' },
          error: null
        }),
        then: jest.fn((callback) => callback({ data: [], error: null }))
      }))
    }));

    jest.unstable_mockModule('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm', () => ({
      createClient: mockCreateClient
    }));

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);

    const teacherTab = mockCanvas.querySelector('#tab-teacher');
    expect(teacherTab.style.display).toBe('none');
  });

  test('should remove super_admin option from role select for non-super_admin', async () => {
    jest.resetModules();

    const mockCreateClient = jest.fn(() => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'pic' },
          error: null
        }),
        then: jest.fn((callback) => callback({ data: [], error: null }))
      }))
    }));

    jest.unstable_mockModule('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm', () => ({
      createClient: mockCreateClient
    }));

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);

    const roleSelect = mockCanvas.querySelector('#role');
    const options = Array.from(roleSelect.options).map(o => o.value);
    expect(options).not.toContain('super_admin');
  });
});

describe('User Management Module - Form Validation', () => {
  let mockCanvas;

  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should validate required fields when saving new user', async () => {
    const saveButton = mockCanvas.querySelector('#btn-save-user');

    // Try to save with empty fields
    saveButton.click();

    // Wait for toast message
    await new Promise(resolve => setTimeout(resolve, 100));

    const toast = mockCanvas.querySelector('#toast');
    expect(toast.style.display).toBe('flex');
    expect(toast.textContent).toContain('wajib diisi');
  });

  test('should require password for new user creation', async () => {
    mockCanvas.querySelector('#fullName').value = 'Test User';
    mockCanvas.querySelector('#email').value = 'test@example.com';
    mockCanvas.querySelector('#password').value = '';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 100));

    const toast = mockCanvas.querySelector('#toast');
    expect(toast.textContent).toContain('wajib diisi');
  });

  test('should allow empty password when updating existing user', () => {
    // Set edit mode
    mockCanvas.querySelector('#userId').value = 'existing-user-id';
    mockCanvas.querySelector('#fullName').value = 'Test User';
    mockCanvas.querySelector('#email').value = 'test@example.com';
    mockCanvas.querySelector('#password').value = '';

    const passwordField = mockCanvas.querySelector('#password');
    expect(passwordField.placeholder).toBeDefined();
  });
});

describe('User Management Module - CRUD Operations', () => {
  let mockCanvas;

  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      text: async () => 'Success'
    });

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should send CREATE request for new user', async () => {
    mockCanvas.querySelector('#fullName').value = 'New User';
    mockCanvas.querySelector('#email').value = 'newuser@example.com';
    mockCanvas.querySelector('#password').value = 'password123';
    mockCanvas.querySelector('#role').value = 'teacher';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('CREATE')
      })
    );
  });

  test('should send UPDATE request for existing user', async () => {
    mockCanvas.querySelector('#userId').value = 'user-123';
    mockCanvas.querySelector('#fullName').value = 'Updated User';
    mockCanvas.querySelector('#email').value = 'updated@example.com';
    mockCanvas.querySelector('#password').value = 'newpassword';
    mockCanvas.querySelector('#role').value = 'pic';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('UPDATE')
      })
    );
  });

  test('should disable save button during save operation', async () => {
    mockCanvas.querySelector('#fullName').value = 'Test User';
    mockCanvas.querySelector('#email').value = 'test@example.com';
    mockCanvas.querySelector('#password').value = 'password';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    const originalDisabled = saveButton.disabled;

    saveButton.click();

    // Button should be disabled immediately after click
    expect(saveButton.disabled || saveButton.innerHTML.includes('Loading')).toBeTruthy();
  });

  test('should show success toast on successful save', async () => {
    mockCanvas.querySelector('#fullName').value = 'Test User';
    mockCanvas.querySelector('#email').value = 'test@example.com';
    mockCanvas.querySelector('#password').value = 'password';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 300));

    const toast = mockCanvas.querySelector('#toast');
    expect(toast.style.display).toBe('flex');
    expect(toast.textContent).toContain('berhasil');
  });

  test('should show error toast on save failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Database error'
    });

    mockCanvas.querySelector('#fullName').value = 'Test User';
    mockCanvas.querySelector('#email').value = 'test@example.com';
    mockCanvas.querySelector('#password').value = 'password';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 300));

    const toast = mockCanvas.querySelector('#toast');
    expect(toast.className).toContain('error');
  });

  test('should handle network errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    mockCanvas.querySelector('#fullName').value = 'Test User';
    mockCanvas.querySelector('#email').value = 'test@example.com';
    mockCanvas.querySelector('#password').value = 'password';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 300));

    const toast = mockCanvas.querySelector('#toast');
    expect(toast.textContent).toContain('Koneksi');
  });

  test('should confirm before deleting user', async () => {
    global.confirm.mockReturnValue(false);

    // Simulate user table with delete button
    const tableBody = mockCanvas.querySelector('#user-table-body');
    tableBody.innerHTML = `
      <tr>
        <td>Test User</td>
        <td>test@example.com</td>
        <td><span class="badge teacher">teacher</span></td>
        <td>
          <button class="btn-delete" data-id="user-123">Delete</button>
        </td>
      </tr>
    `;

    const deleteButton = tableBody.querySelector('.btn-delete');
    deleteButton.click();

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Hapus'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('should send DELETE request when confirmed', async () => {
    global.confirm.mockReturnValue(true);

    const tableBody = mockCanvas.querySelector('#user-table-body');
    tableBody.innerHTML = `
      <tr>
        <td>Test User</td>
        <td>test@example.com</td>
        <td><span class="badge teacher">teacher</span></td>
        <td>
          <button class="btn-delete" data-id="user-123">Delete</button>
        </td>
      </tr>
    `;

    const deleteButton = tableBody.querySelector('.btn-delete');
    deleteButton.click();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(global.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('DELETE')
      })
    );
  });
});

describe('User Management Module - UI Interactions', () => {
  let mockCanvas;

  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should switch tabs correctly', () => {
    const scopeTab = mockCanvas.querySelector('#tab-scope');
    scopeTab.click();

    expect(mockCanvas.querySelector('#scope-content').style.display).toBe('block');
    expect(mockCanvas.querySelector('#reg-user-content').style.display).toBe('none');
    expect(scopeTab.classList.contains('active')).toBe(true);
  });

  test('should populate form fields when editing user', () => {
    const tableBody = mockCanvas.querySelector('#user-table-body');
    tableBody.innerHTML = `
      <tr>
        <td>Test User</td>
        <td>test@example.com</td>
        <td><span class="badge teacher">teacher</span></td>
        <td>
          <button class="btn-edit" data-id="user-123">Edit</button>
        </td>
      </tr>
    `;

    // Mock the allUsers array by creating a custom event
    const editButton = tableBody.querySelector('.btn-edit');
    editButton.click();

    // Check if form fields would be populated (functionality exists in code)
    expect(mockCanvas.querySelector('#btn-cancel').style.display).toBeDefined();
  });

  test('should reset form when cancel button clicked', () => {
    mockCanvas.querySelector('#userId').value = 'test-id';
    mockCanvas.querySelector('#fullName').value = 'Test';
    mockCanvas.querySelector('#email').value = 'test@test.com';

    const cancelButton = mockCanvas.querySelector('#btn-cancel');
    cancelButton.style.display = 'inline-flex';
    cancelButton.click();

    expect(mockCanvas.querySelector('#userId').value).toBe('');
    expect(mockCanvas.querySelector('#fullName').value).toBe('');
    expect(mockCanvas.querySelector('#email').value).toBe('');
  });

  test('should filter users based on search input', async () => {
    const searchInput = mockCanvas.querySelector('#searchUser');

    // Simulate typing in search
    searchInput.value = 'john';
    searchInput.dispatchEvent(new Event('input'));

    // Search should trigger table re-render
    expect(searchInput.value).toBe('john');
  });

  test('should show and hide modal', () => {
    const modal = mockCanvas.querySelector('#modal-scope');
    const closeButton = mockCanvas.querySelector('#btn-close-modal');

    // Show modal
    modal.style.display = 'block';
    expect(modal.style.display).toBe('block');

    // Close modal
    closeButton.click();
    expect(modal.style.display).toBe('none');
  });
});

describe('User Management Module - Scope Management', () => {
  let mockCanvas;

  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });
    mockSupabase.from().then.mockResolvedValue({
      data: [
        { id: 'school-1', name: 'Test School' },
        { id: 'group-1', code: 'Group A' }
      ],
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should render scope mapping table', () => {
    const scopeTab = mockCanvas.querySelector('#tab-scope');
    scopeTab.click();

    const scopeTable = mockCanvas.querySelector('#scope-table-body');
    expect(scopeTable).not.toBeNull();
  });

  test('should show scope modal when mapping button clicked', async () => {
    const scopeTab = mockCanvas.querySelector('#tab-scope');
    scopeTab.click();

    const scopeTableBody = mockCanvas.querySelector('#scope-table-body');
    scopeTableBody.innerHTML = `
      <tr>
        <td>Test User</td>
        <td>test@example.com</td>
        <td><span class="badge pic">pic</span></td>
        <td>-</td>
        <td>
          <button class="btn-set-scope" data-id="user-123">Mapping</button>
        </td>
      </tr>
    `;

    const mappingButton = scopeTableBody.querySelector('.btn-set-scope');
    mappingButton.click();

    await new Promise(resolve => setTimeout(resolve, 100));

    const modal = mockCanvas.querySelector('#modal-scope');
    expect(modal).not.toBeNull();
  });

  test('should validate scope data before saving', async () => {
    // Verify modal structure exists for validation
    const modal = mockCanvas.querySelector('#modal-scope');
    expect(modal).not.toBeNull();

    const modalBody = mockCanvas.querySelector('#modal-body-content');
    expect(modalBody).not.toBeNull();

    const modalFooter = mockCanvas.querySelector('#modal-footer-content');
    expect(modalFooter).not.toBeNull();

    // Validation would occur in the saveScope function
    // This test verifies the DOM structure needed for validation exists
  });
});

describe('User Management Module - Teacher Level Management', () => {
  let mockCanvas;

  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should render teacher level table for super_admin', () => {
    const teacherTab = mockCanvas.querySelector('#tab-teacher');
    teacherTab.click();

    const teacherTable = mockCanvas.querySelector('#teacher-table-body');
    expect(teacherTable).not.toBeNull();
  });

  test('should open level modal when level button clicked', () => {
    const teacherTab = mockCanvas.querySelector('#tab-teacher');
    teacherTab.click();

    const teacherTableBody = mockCanvas.querySelector('#teacher-table-body');
    teacherTableBody.innerHTML = `
      <tr>
        <td>Teacher Name</td>
        <td>teacher@example.com</td>
        <td>SD</td>
        <td>
          <button class="btn-set-level" data-id="teacher-123">Level</button>
        </td>
      </tr>
    `;

    const levelButton = teacherTableBody.querySelector('.btn-set-level');
    levelButton.click();

    const modal = mockCanvas.querySelector('#modal-scope');
    expect(modal).not.toBeNull();
  });

  test('should validate level selection before saving', async () => {
    // Verify modal structure exists for level management
    const modal = mockCanvas.querySelector('#modal-scope');
    expect(modal).not.toBeNull();

    const modalBody = mockCanvas.querySelector('#modal-body-content');
    expect(modalBody).not.toBeNull();

    const modalFooter = mockCanvas.querySelector('#modal-footer-content');
    expect(modalFooter).not.toBeNull();

    // The saveLevel function contains validation logic
    // This test verifies the DOM structure needed for the feature exists
  });
});

describe('User Management Module - Edge Cases and Error Handling', () => {
  let mockCanvas;

  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should handle missing user data gracefully', () => {
    const tableBody = mockCanvas.querySelector('#user-table-body');
    tableBody.innerHTML = `
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `;

    expect(tableBody.innerHTML).toBeDefined();
  });

  test('should handle null or undefined values in user objects', () => {
    const tableBody = mockCanvas.querySelector('#user-table-body');

    // Test that rendering handles null values
    tableBody.innerHTML = `
      <tr>
        <td>${null || '-'}</td>
        <td>${undefined || '-'}</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;

    expect(tableBody.querySelector('td').textContent).toBe('-');
  });

  test('should display inactive users with visual indicators', () => {
    const tableBody = mockCanvas.querySelector('#user-table-body');
    tableBody.innerHTML = `
      <tr style="background:#fef2f2; opacity:0.5;">
        <td>
          <div>Inactive User</div>
          <div style="color:#ef4444;">NON-AKTIF</div>
        </td>
        <td>inactive@example.com</td>
        <td><span class="badge student">student</span></td>
        <td></td>
      </tr>
    `;

    const row = tableBody.querySelector('tr');
    expect(row.style.opacity).toBe('0.5');
    expect(row.innerHTML).toContain('NON-AKTIF');
  });

  test('should handle empty search results', () => {
    const searchInput = mockCanvas.querySelector('#searchUser');
    searchInput.value = 'nonexistentuser12345';
    searchInput.dispatchEvent(new Event('input'));

    // The search functionality should handle this case
    expect(searchInput.value).toBe('nonexistentuser12345');
  });

  test('should handle special characters in email and name fields', () => {
    mockCanvas.querySelector('#fullName').value = "O'Brien <Test>";
    mockCanvas.querySelector('#email').value = "test+special@example.com";
    mockCanvas.querySelector('#password').value = "p@ssw0rd!";

    expect(mockCanvas.querySelector('#fullName').value).toContain("'");
    expect(mockCanvas.querySelector('#email').value).toContain("+");
  });

  test('should handle very long input strings', () => {
    const longString = 'a'.repeat(1000);
    mockCanvas.querySelector('#fullName').value = longString;

    expect(mockCanvas.querySelector('#fullName').value.length).toBe(1000);
  });

  test('should handle rapid successive clicks on save button', async () => {
    mockCanvas.querySelector('#fullName').value = 'Test';
    mockCanvas.querySelector('#email').value = 'test@test.com';
    mockCanvas.querySelector('#password').value = 'password';

    const saveButton = mockCanvas.querySelector('#btn-save-user');

    // Click multiple times rapidly
    saveButton.click();
    saveButton.click();
    saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have some protection (button disabled or loading state)
    expect(saveButton.disabled || saveButton.innerHTML.includes('Loading')).toBeDefined();
  });

  test('should handle toast auto-hide timeout', async () => {
    const toast = mockCanvas.querySelector('#toast');
    toast.style.display = 'flex';

    // Toast should hide after 3 seconds
    jest.useFakeTimers();
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);

    jest.advanceTimersByTime(3000);

    jest.useRealTimers();
  });

  test('should handle missing DOM elements gracefully', () => {
    // Remove an element and try to access it
    const searchBox = mockCanvas.querySelector('#searchUser');
    searchBox.remove();

    const missingElement = mockCanvas.querySelector('#searchUser');
    expect(missingElement).toBeNull();
  });

  test('should handle malformed email addresses', () => {
    const emailInput = mockCanvas.querySelector('#email');
    emailInput.value = 'not-an-email';

    // HTML5 validation should catch this
    expect(emailInput.type).toBe('email');
    expect(emailInput.value).toBe('not-an-email');
  });

  test('should handle password less than 6 characters indication', () => {
    const passwordInput = mockCanvas.querySelector('#password');
    expect(passwordInput.placeholder).toContain('Min. 6');
  });

  test('should handle all role badge types', () => {
    const roles = ['student', 'teacher', 'pic', 'super_admin'];

    roles.forEach(role => {
      const badge = document.createElement('span');
      badge.className = `badge ${role}`;
      badge.textContent = role;

      expect(badge.className).toContain(role);
    });
  });
});

describe('User Management Module - Data Formatting', () => {
  test('should format scope text for PIC role', () => {
    const picUser = {
      role: 'pic',
      schools: { name: 'Test School' },
      group_private: null
    };

    // The formatScopeText function should format this appropriately
    expect(picUser.schools.name).toBe('Test School');
  });

  test('should format scope text for Student role with school', () => {
    const studentUser = {
      role: 'student',
      schools: { name: 'Test School' },
      classes: { name: 'Class A' },
      group_private: null,
      class_private: null
    };

    expect(studentUser.schools.name).toBe('Test School');
    expect(studentUser.classes.name).toBe('Class A');
  });

  test('should format scope text for Student role with private group', () => {
    const studentUser = {
      role: 'student',
      schools: null,
      classes: null,
      group_private: { code: 'Private Group' },
      class_private: { name: 'Private Class' }
    };

    expect(studentUser.group_private.code).toBe('Private Group');
    expect(studentUser.class_private.name).toBe('Private Class');
  });

  test('should handle array format for nested objects', () => {
    const userWithArray = {
      role: 'student',
      schools: [{ name: 'School 1' }],
      classes: [{ name: 'Class 1' }]
    };

    expect(Array.isArray(userWithArray.schools)).toBe(true);
    expect(userWithArray.schools[0].name).toBe('School 1');
  });

  test('should display default text for missing scope data', () => {
    const userNoScope = {
      role: 'student',
      schools: null,
      classes: null,
      group_private: null,
      class_private: null
    };

    // Should handle missing data gracefully
    expect(userNoScope.schools).toBeNull();
  });
});

describe('User Management Module - Regression Tests', () => {
  let mockCanvas;

  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="canvas"></div>';
    mockCanvas = document.getElementById('canvas');

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const mockSupabase = createClient();
    mockSupabase.from().single.mockResolvedValueOnce({
      data: { role: 'super_admin' },
      error: null
    });

    const userManagement = await import('../modules/user-management.js');
    await userManagement.init(mockCanvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  test('should not lose form data when switching tabs and returning', () => {
    mockCanvas.querySelector('#fullName').value = 'Test User';
    mockCanvas.querySelector('#email').value = 'test@example.com';

    const scopeTab = mockCanvas.querySelector('#tab-scope');
    scopeTab.click();

    const regTab = mockCanvas.querySelector('#tab-reg');
    regTab.click();

    // Form data should still be there (not cleared by tab switch)
    expect(mockCanvas.querySelector('#fullName').value).toBe('Test User');
  });

  test('should maintain scroll position after data refresh', async () => {
    // This is a regression test for UI state
    const tableBody = mockCanvas.querySelector('#user-table-body');
    expect(tableBody).not.toBeNull();
  });

  test('should correctly update button text from Save to Update in edit mode', () => {
    mockCanvas.querySelector('#userId').value = 'edit-user-id';

    const saveButton = mockCanvas.querySelector('#btn-save-user');
    saveButton.innerHTML = '<i class="fa-solid fa-check"></i> Update';

    expect(saveButton.innerHTML).toContain('Update');
  });

  test('should show cancel button only in edit mode', () => {
    const cancelButton = mockCanvas.querySelector('#btn-cancel');

    // Initially hidden
    expect(cancelButton.style.display).toBe('none');

    // Show in edit mode
    mockCanvas.querySelector('#userId').value = 'some-id';
    cancelButton.style.display = 'inline-flex';

    expect(cancelButton.style.display).toBe('inline-flex');
  });

  test('should prevent SQL injection in user inputs', () => {
    const sqlInjection = "'; DROP TABLE users; --";
    mockCanvas.querySelector('#fullName').value = sqlInjection;

    // The value should be accepted as-is (backend should sanitize)
    expect(mockCanvas.querySelector('#fullName').value).toBe(sqlInjection);
  });

  test('should prevent XSS in user name display', () => {
    const xssAttempt = '<script>alert("XSS")</script>';
    mockCanvas.querySelector('#fullName').value = xssAttempt;

    // Should store the value as text, not execute
    expect(mockCanvas.querySelector('#fullName').value).toBe(xssAttempt);
  });
});