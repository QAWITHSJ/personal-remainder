<script setup>
import { computed, onMounted, ref } from 'vue'

const ADMIN_EMAIL = 'admin@personalreminder.com'
const ADMIN_PASSWORD = 'admin123'
const USERS_KEY = 'personal_reminder_users'
const SESSION_KEY = 'personal_reminder_session'
const REMINDERS_PREFIX = 'personal_reminder_items_'

const defaultAuthForm = {
  email: '',
  password: ''
}

const defaultForm = {
  title: '',
  dueDate: '',
  category: 'Insurance',
  notes: ''
}

const authForm = ref({ ...defaultAuthForm })
const authMode = ref('login')
const authRole = ref('user')
const users = ref([])
const currentUser = ref(null)
const reminders = ref([])
const statusMessage = ref('')
const authError = ref('')
const form = ref({ ...defaultForm })
const categories = ['Insurance', 'License', 'Passport', 'Marriage', 'Medical', 'Tax', 'Other']

const formatDate = (value) => {
  if (!value) return 'No date'

  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const formatDateTime = (value) => {
  if (!value) return 'Never'

  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getDueTone = (value) => {
  if (!value) return 'neutral'

  const today = new Date()
  const dueDate = new Date(`${value}T00:00:00`)
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 7) return 'soon'
  return 'upcoming'
}

const getReminderKey = (email) => `${REMINDERS_PREFIX}${(email || '').trim().toLowerCase()}`

const ensureAdminUser = (list) => {
  const adminExists = list.some((user) => user.email.toLowerCase() === ADMIN_EMAIL)

  if (!adminExists) {
    list.unshift({
      id: 'admin-1',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'super-admin',
      createdAt: new Date().toISOString(),
      lastLogin: null
    })
  }

  return list
}

const loadUsers = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const items = Array.isArray(raw) ? raw : []
    const normalized = ensureAdminUser(items)
    localStorage.setItem(USERS_KEY, JSON.stringify(normalized))
    return normalized
  } catch (error) {
    return ensureAdminUser([])
  }
}

const saveUsers = () => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users.value))
}

const saveSession = () => {
  if (currentUser.value) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser.value))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

const loadUserReminders = () => {
  if (!currentUser.value) return []

  try {
    const raw = JSON.parse(localStorage.getItem(getReminderKey(currentUser.value.email)) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch (error) {
    return []
  }
}

const saveUserReminders = () => {
  if (!currentUser.value) return
  localStorage.setItem(getReminderKey(currentUser.value.email), JSON.stringify(reminders.value))
}

const visibleUsers = computed(() =>
  users.value.filter((user) => user.role !== 'super-admin')
)

const adminSummary = computed(() => ({
  total: visibleUsers.value.length,
  active: visibleUsers.value.filter((user) => user.lastLogin).length
}))

const setAuthError = (message) => {
  authError.value = message
}

const handleSignup = () => {
  const email = authForm.value.email.trim().toLowerCase()
  const password = authForm.value.password.trim()

  if (!email || !password) {
    setAuthError('Email and password are required.')
    return
  }

  if (password.length < 6) {
    setAuthError('Password must be at least 6 characters long.')
    return
  }

  if (email === ADMIN_EMAIL) {
    setAuthError('This email is reserved for the super admin account.')
    return
  }

  const existing = users.value.find((user) => user.email.toLowerCase() === email)
  if (existing) {
    setAuthError('This email is already registered. Please log in instead.')
    return
  }

  const newUser = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    email,
    password,
    role: 'user',
    createdAt: new Date().toISOString(),
    lastLogin: null
  }

  users.value.unshift(newUser)
  saveUsers()

  currentUser.value = {
    id: newUser.id,
    email: newUser.email,
    password: newUser.password,
    role: 'user',
    lastLogin: newUser.lastLogin
  }

  reminders.value = loadUserReminders()
  saveSession()
  authForm.value = { ...defaultAuthForm }
  authError.value = ''
  statusMessage.value = 'Signup successful. Your reminder dashboard is ready.'
}

const handleLogin = () => {
  const email = authForm.value.email.trim().toLowerCase()
  const password = authForm.value.password.trim()

  if (!email || !password) {
    setAuthError('Please enter both email and password.')
    return
  }

  if (authRole.value === 'admin') {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      currentUser.value = {
        id: 'admin-1',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'super-admin',
        lastLogin: new Date().toISOString()
      }
      saveSession()
      authForm.value = { ...defaultAuthForm }
      authError.value = ''
      statusMessage.value = 'Super admin login successful.'
      return
    }

    setAuthError('Invalid super admin credentials.')
    return
  }

  const user = users.value.find(
    (item) => item.email.toLowerCase() === email && item.password === password
  )

  if (!user) {
    setAuthError('Invalid email or password for user login.')
    return
  }

  user.lastLogin = new Date().toISOString()
  currentUser.value = {
    id: user.id,
    email: user.email,
    password: user.password,
    role: 'user',
    lastLogin: user.lastLogin
  }

  saveUsers()
  saveSession()
  reminders.value = loadUserReminders()
  authForm.value = { ...defaultAuthForm }
  authError.value = ''
  statusMessage.value = `Welcome back, ${user.email}.`
}

const handleAuthSubmit = () => {
  if (authRole.value === 'admin') {
    handleLogin()
    return
  }

  if (authMode.value === 'signup') {
    handleSignup()
  } else {
    handleLogin()
  }
}

const logout = () => {
  currentUser.value = null
  reminders.value = []
  statusMessage.value = ''
  saveSession()
}

const submitReminder = () => {
  if (!currentUser.value) return

  if (!form.value.title.trim() || !form.value.dueDate) {
    statusMessage.value = 'Please add a reminder name and due date.'
    return
  }

  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    title: form.value.title.trim(),
    dueDate: form.value.dueDate,
    category: form.value.category,
    notes: form.value.notes.trim(),
    createdAt: new Date().toISOString()
  }

  reminders.value = [item, ...reminders.value.filter((entry) => entry.id !== item.id)]
  saveUserReminders()
  form.value = { ...defaultForm }
  statusMessage.value = `Reminder saved for ${formatDate(item.dueDate)}.`
}

const removeReminder = (id) => {
  reminders.value = reminders.value.filter((item) => item.id !== id)
  saveUserReminders()
}

const deleteUser = (email) => {
  const confirmed = window.confirm(`Delete user ${email}?`)
  if (!confirmed) return

  users.value = users.value.filter((user) => user.email !== email)
  saveUsers()
  localStorage.removeItem(getReminderKey(email))
}

const summary = computed(() => ({
  total: reminders.value.length,
  dueSoon: reminders.value.filter((item) => getDueTone(item.dueDate) === 'soon').length,
  expired: reminders.value.filter((item) => getDueTone(item.dueDate) === 'expired').length
}))

onMounted(() => {
  users.value = loadUsers()
  currentUser.value = loadSession()

  if (currentUser.value) {
    reminders.value = loadUserReminders()
  }
})
</script>

<template>
  <div class="app-shell">
    <header v-if="currentUser" class="topbar">
      <div>
        <p class="eyebrow">Document tracker</p>
        <h1>{{ currentUser.role === 'super-admin' ? 'Super Admin' : 'Personal Reminder' }}</h1>
      </div>

      <div class="topbar-actions">
        <div class="topbar-badge">{{ currentUser.email }}</div>
        <button class="secondary-btn" type="button" @click="logout">Logout</button>
      </div>
    </header>

    <div v-if="!currentUser" class="auth-shell">
      <div class="auth-card">
        <div class="auth-header">
          <p class="eyebrow">Access portal</p>
          <h1>Personal Reminder</h1>
        </div>

        <div class="role-toggle">
          <button
            type="button"
            :class="authRole === 'user' ? 'active' : ''"
            @click="authRole = 'user'"
          >
            User
          </button>
          <button
            type="button"
            :class="authRole === 'admin' ? 'active' : ''"
            @click="authRole = 'admin'"
          >
            Super Admin
          </button>
        </div>

        <div v-if="authRole === 'user'" class="mode-toggle">
          <button type="button" :class="authMode === 'login' ? 'active' : ''" @click="authMode = 'login'">
            Login
          </button>
          <button type="button" :class="authMode === 'signup' ? 'active' : ''" @click="authMode = 'signup'">
            Signup
          </button>
        </div>

        <form class="auth-form" @submit.prevent="handleAuthSubmit">
          <label>
            <span>Email</span>
            <input v-model="authForm.email" type="email" placeholder="you@example.com" />
          </label>

          <label>
            <span>Password</span>
            <input v-model="authForm.password" type="password" placeholder="Enter password" />
          </label>

          <button class="primary-btn" type="submit">
            {{ authRole === 'admin' ? 'Admin Login' : authMode === 'signup' ? 'Create Account' : 'Login' }}
          </button>
        </form>

        <p v-if="authError" class="error-box">{{ authError }}</p>
      </div>
    </div>

    <div v-else-if="currentUser.role === 'super-admin'" class="admin-shell">
      <section class="panel admin-panel">
        <div class="list-header admin-header">
          <h2>Users overview</h2>
          <div class="admin-summary">
            <span>Total: {{ adminSummary.total }}</span>
            <span>Last logins: {{ adminSummary.active }}</span>
          </div>
        </div>

        <div class="table-wrap">
          <table class="user-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Password</th>
                <th>Created At</th>
                <th>Last Login</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in visibleUsers" :key="user.email">
                <td>{{ user.email }}</td>
                <td>{{ user.password }}</td>
                <td>{{ formatDateTime(user.createdAt) }}</td>
                <td>{{ formatDateTime(user.lastLogin) }}</td>
                <td>
                  <button class="delete-btn" type="button" @click="deleteUser(user.email)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div v-else class="user-shell">
      <main class="board">
        <section class="panel form-panel">
          <h2>Add reminder</h2>

          <form @submit.prevent="submitReminder">
            <label>
              <span>Reminder name</span>
              <input v-model="form.title" type="text" placeholder="Driving licence renewal" />
            </label>

            <div class="two-up">
              <label>
                <span>Due date</span>
                <input v-model="form.dueDate" type="date" />
              </label>

              <label>
                <span>Category</span>
                <select v-model="form.category">
                  <option v-for="category in categories" :key="category" :value="category">
                    {{ category }}
                  </option>
                </select>
              </label>
            </div>

            <label>
              <span>Notes</span>
              <textarea v-model="form.notes" rows="4" placeholder="Example: Insurance expiry in March 2027, renewal before 24th."></textarea>
            </label>

            <button class="primary-btn" type="submit">Save reminder</button>
          </form>

          <p v-if="statusMessage" class="status">{{ statusMessage }}</p>
        </section>

        <aside class="panel summary-panel">
          <h2>Overview</h2>

          <div class="stat-grid">
            <div class="stat-card">
              <span>Total</span>
              <strong>{{ summary.total }}</strong>
            </div>
            <div class="stat-card warning">
              <span>Due soon</span>
              <strong>{{ summary.dueSoon }}</strong>
            </div>
            <div class="stat-card danger">
              <span>Expired</span>
              <strong>{{ summary.expired }}</strong>
            </div>
          </div>
        </aside>
      </main>

      <section class="panel list-panel">
        <div class="list-header">
          <h2>Upcoming reminders</h2>
        </div>

        <div v-if="reminders.length" class="reminder-list">
          <article v-for="item in reminders" :key="item.id" class="reminder-card" :class="getDueTone(item.dueDate)">
            <div class="reminder-main">
              <span class="tag">{{ item.category }}</span>
              <h3>{{ item.title }}</h3>
              <p v-if="item.notes">{{ item.notes }}</p>
            </div>

            <div class="reminder-meta">
              <strong>{{ formatDate(item.dueDate) }}</strong>
              <small>{{ item.createdAt ? formatDateTime(item.createdAt) : 'saved just now' }}</small>
            </div>

            <button class="delete-btn" type="button" @click="removeReminder(item.id)">Remove</button>
          </article>
        </div>

        <div v-else class="empty-state">
          No reminders yet. Add your first document or renewal date.
        </div>
      </section>
    </div>
  </div>
</template>
