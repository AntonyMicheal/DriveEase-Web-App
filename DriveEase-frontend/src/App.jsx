import { useEffect, useMemo, useState } from 'react'
import {
  API_META,
  cancelBooking,
  createBooking,
  createVehicle,
  deleteVehicle,
  fetchMe,
  listBookings,
  listMyBookings,
  listVehicles,
  login,
  register,
  resolveMediaUrl,
  updateBookingStatus,
  updateMe,
  updateVehicle,
  uploadAvatar,
  uploadVehicleImage,
} from './api'
import './App.css'

const DEFAULT_TAB = 'explore'

const emptyVehicleForm = {
  name: '',
  type: 'ev',
  brand: '',
  model: '',
  year: '',
  daily_rate: '',
  battery_range_km: '',
  location: '',
  is_available: true,
}

const emptyProfileForm = {
  full_name: '',
  phone: '',
  password: '',
}

function App() {
  const [token, setToken] = useState(
    () => window.localStorage.getItem('driveease_token') || ''
  )
  const [user, setUser] = useState(null)
  const [avatarSrc, setAvatarSrc] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [adminBookings, setAdminBookings] = useState([])
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    avatarFile: null,
  })
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [bookingForm, setBookingForm] = useState({
    vehicle_id: '',
    start_date: '',
    end_date: '',
  })
  const [vehicleEdits, setVehicleEdits] = useState({})

  const isAuthed = Boolean(token)
  const isAdmin = Boolean(user?.is_admin)

  const navItems = useMemo(() => {
    const base = [
      { key: 'explore', label: 'Explore' },
      { key: 'bookings', label: 'My Bookings' },
      { key: 'profile', label: 'Profile' },
    ]
    if (isAdmin) {
      base.push({ key: 'admin-vehicles', label: 'Admin Vehicles' })
      base.push({ key: 'admin-bookings', label: 'Admin Bookings' })
    }
    return base
  }, [isAdmin])

  const showNotice = (message) => {
    setNotice(message)
    setError('')
  }

  const showError = (message) => {
    setError(message)
    setNotice('')
  }

  const handleLogout = () => {
    window.localStorage.removeItem('driveease_token')
    setToken('')
    setUser(null)
    setMyBookings([])
    setAdminBookings([])
    setActiveTab(DEFAULT_TAB)
    showNotice('Logged out.')
  }

  const loadVehicles = async () => {
    const data = await listVehicles()
    setVehicles(data || [])
  }

  const loadAuthData = async (activeToken) => {
    if (!activeToken) return
    const me = await fetchMe(activeToken)
    setUser(me)
    setProfileForm({
      ...emptyProfileForm,
      full_name: me.full_name || '',
      phone: me.phone || '',
    })
  }

  const loadMyBookings = async (activeToken) => {
    if (!activeToken) return
    const data = await listMyBookings(activeToken)
    setMyBookings(data || [])
  }

  const loadAdminBookings = async (activeToken) => {
    if (!activeToken || !isAdmin) return
    const data = await listBookings(activeToken)
    setAdminBookings(data || [])
  }

  useEffect(() => {
    loadVehicles().catch((err) => showError(err.message))
  }, [])

  useEffect(() => {
    if (!token) return
    loadAuthData(token)
      .then(() => loadMyBookings(token))
      .catch((err) => showError(err.message))
  }, [token])

  useEffect(() => {
    let active = true
    let objectUrl = null
    const avatarPath = user?.avatar_url
    if (!avatarPath) {
      setAvatarSrc(null)
      return
    }
    const url = resolveMediaUrl(avatarPath)
    const fetchAvatar = async () => {
      try {
        if (!token) {
          setAvatarSrc(url)
          return
        }
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) {
          setAvatarSrc(url)
          return
        }
        const blob = await resp.blob()
        objectUrl = URL.createObjectURL(blob)
        if (active) setAvatarSrc(objectUrl)
      } catch (e) {
        setAvatarSrc(url)
      }
    }
    fetchAvatar()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [user?.avatar_url, token])

  useEffect(() => {
    if (!token || !isAdmin) return
    loadAdminBookings(token).catch((err) => showError(err.message))
  }, [token, isAdmin])

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    try {
      if (authMode === 'login') {
        const data = await login(authForm.email, authForm.password)
        window.localStorage.setItem('driveease_token', data.access_token)
        setToken(data.access_token)
        showNotice('Welcome back!')
      } else {
        await register({
          email: authForm.email,
          password: authForm.password,
          full_name: authForm.full_name || null,
          phone: authForm.phone || null,
        })
        if (authForm.avatarFile) {
          const data = await login(authForm.email, authForm.password)
          window.localStorage.setItem('driveease_token', data.access_token)
          setToken(data.access_token)
          await uploadAvatar(data.access_token, authForm.avatarFile)
          await loadAuthData(data.access_token)
          showNotice('Account created and avatar uploaded.')
        } else {
          showNotice('Account created. Please log in.')
          setAuthMode('login')
        }
      }
      setAuthForm({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        avatarFile: null,
      })
    } catch (err) {
      showError(err.message)
    }
  }

  const handleVehicleCreate = async (event) => {
    event.preventDefault()
    try {
      const payload = {
        ...vehicleForm,
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        daily_rate: vehicleForm.daily_rate
          ? Number(vehicleForm.daily_rate)
          : 0,
        battery_range_km: vehicleForm.battery_range_km
          ? Number(vehicleForm.battery_range_km)
          : null,
      }
      await createVehicle(token, payload)
      setVehicleForm(emptyVehicleForm)
      await loadVehicles()
      showNotice('Vehicle created.')
    } catch (err) {
      showError(err.message)
    }
  }

  const handleVehicleEditChange = (id, field, value) => {
    setVehicleEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }))
  }

  const handleVehicleUpdate = async (id) => {
    try {
      const draft = vehicleEdits[id] || {}
      const payload = {
        daily_rate: draft.daily_rate ? Number(draft.daily_rate) : undefined,
        location: draft.location || undefined,
        is_available:
          typeof draft.is_available === 'boolean'
            ? draft.is_available
            : undefined,
      }
      await updateVehicle(token, id, payload)
      await loadVehicles()
      showNotice('Vehicle updated.')
    } catch (err) {
      showError(err.message)
    }
  }

  const handleVehicleDelete = async (id) => {
    try {
      await deleteVehicle(token, id)
      await loadVehicles()
      showNotice('Vehicle deleted.')
    } catch (err) {
      showError(err.message)
    }
  }

  const handleVehicleImageUpload = async (id, file) => {
    try {
      await uploadVehicleImage(token, id, file)
      await loadVehicles()
      showNotice('Vehicle image uploaded.')
    } catch (err) {
      showError(err.message)
    }
  }

  const handleBookingCreate = async (event) => {
    event.preventDefault()
    try {
      const payload = {
        vehicle_id: Number(bookingForm.vehicle_id),
        start_date: bookingForm.start_date,
        end_date: bookingForm.end_date,
      }
      await createBooking(token, payload)
      setBookingForm({ vehicle_id: '', start_date: '', end_date: '' })
      await loadMyBookings(token)
      showNotice('Booking requested.')
    } catch (err) {
      showError(err.message)
    }
  }

  const handleCancelBooking = async (id) => {
    try {
      await cancelBooking(token, id)
      await loadMyBookings(token)
      showNotice('Booking cancelled.')
    } catch (err) {
      showError(err.message)
    }
  }

  const handleAdminStatusUpdate = async (id, status) => {
    try {
      await updateBookingStatus(token, id, status)
      await loadAdminBookings(token)
      showNotice('Status updated.')
    } catch (err) {
      showError(err.message)
    }
  }

  const handleProfileUpdate = async (event) => {
    event.preventDefault()
    try {
      const payload = {
        full_name: profileForm.full_name || null,
        phone: profileForm.phone || null,
        password: profileForm.password || null,
      }
      await updateMe(token, payload)
      await loadAuthData(token)
      showNotice('Profile updated.')
      setProfileForm((prev) => ({ ...prev, password: '' }))
    } catch (err) {
      showError(err.message)
    }
  }

  const handleAvatarUpload = async (file) => {
    try {
      await uploadAvatar(token, file)
      await loadAuthData(token)
      showNotice('Avatar updated.')
    } catch (err) {
      showError(err.message)
    }
  }

  const visibleVehicles = vehicles.filter((vehicle) => vehicle.is_available)

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">DriveEase Platform</p>
          <h1>DriveEase</h1>
          <p className="subhead">
            EV rentals, bookings, and fleet ops in one shared workspace.
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="panel auth-panel">
          <div className="panel-header">
            <h2>{isAuthed ? 'Your Workspace' : 'Access Portal'}</h2>
            {isAuthed && (
              <button className="ghost" type="button" onClick={handleLogout}>
                Sign out
              </button>
            )}
          </div>
          {isAuthed ? (
            <div className="user-card">
              <div className="avatar">
                {user?.avatar_url ? (
                  <img
                    src={resolveMediaUrl(user.avatar_url)}
                    alt={user.full_name || user.email}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <span>{user?.email?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div>
                <p className="label">Signed in as</p>
                <p className="headline">{user?.full_name || 'DriveEase user'}</p>
                <p className="muted">{user?.email}</p>
                <p className="tag">{isAdmin ? 'Admin' : 'Member'}</p>
              </div>
            </div>
          ) : (
            <form className="form" onSubmit={handleAuthSubmit}>
              <div className="toggle">
                <button
                  type="button"
                  className={authMode === 'login' ? 'active' : ''}
                  onClick={() => setAuthMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={authMode === 'register' ? 'active' : ''}
                  onClick={() => setAuthMode('register')}
                >
                  Register
                </button>
              </div>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              {authMode === 'register' && (
                <>
                  <label>
                    Full name
                    <input
                      type="text"
                      value={authForm.full_name}
                      onChange={(event) =>
                        setAuthForm((prev) => ({
                          ...prev,
                          full_name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      type="tel"
                      value={authForm.phone}
                      onChange={(event) =>
                        setAuthForm((prev) => ({
                          ...prev,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Avatar image (optional)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setAuthForm((prev) => ({
                          ...prev,
                          avatarFile: event.target.files?.[0] || null,
                        }))
                      }
                    />
                  </label>
                </>
              )}
              <button className="primary" type="submit">
                {authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          )}
        </section>

        <section className="panel nav-panel">
          <h2>Navigate</h2>
          <div className="nav-list">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={activeTab === item.key ? 'active' : ''}
                type="button"
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {notice && <p className="notice">{notice}</p>}
          {error && <p className="error">{error}</p>}
          <div className="divider" />
          <h3>Quick Stats</h3>
          <div className="stats">
            <div>
              <p className="label">Vehicles</p>
              <p className="headline">{vehicles.length}</p>
            </div>
            <div>
              <p className="label">Available</p>
              <p className="headline">{visibleVehicles.length}</p>
            </div>
            <div>
              <p className="label">My bookings</p>
              <p className="headline">{myBookings.length}</p>
            </div>
          </div>
        </section>

        <section className="panel content-panel">
          {activeTab === 'explore' && (
            <div className="section">
              <h2>Explore Vehicles</h2>
              <p className="muted">
                Browse the fleet. Availability updates in real time.
              </p>
              <div className="vehicle-grid">
                {vehicles.map((vehicle) => (
                  <article key={vehicle.id} className="vehicle-card">
                    <div className="vehicle-media">
                      {vehicle.image_url ? (
                        <img
                          src={resolveMediaUrl(vehicle.image_url)}
                          alt={vehicle.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="vehicle-placeholder">
                          <span>{vehicle.name[0]}</span>
                        </div>
                      )}
                      <span
                        className={`status ${
                          vehicle.is_available ? 'ok' : 'off'
                        }`}
                      >
                        {vehicle.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div className="vehicle-body">
                      <h3>{vehicle.name}</h3>
                      <p className="muted">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <p className="meta">
                        {vehicle.type.toUpperCase()} · {vehicle.location || '—'}
                      </p>
                      <p className="price">${vehicle.daily_rate} / day</p>
                    </div>
                  </article>
                ))}
              </div>
              {isAuthed && (
                <form className="form booking-form" onSubmit={handleBookingCreate}>
                  <h3>Request a Booking</h3>
                  <label>
                    Vehicle
                    <select
                      required
                      value={bookingForm.vehicle_id}
                      onChange={(event) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          vehicle_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} ({vehicle.location || 'HQ'})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Start date
                    <input
                      type="date"
                      required
                      value={bookingForm.start_date}
                      onChange={(event) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          start_date: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      required
                      value={bookingForm.end_date}
                      onChange={(event) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          end_date: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button className="primary" type="submit">
                    Submit booking
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="section">
              <h2>My Bookings</h2>
              {!isAuthed ? (
                <p className="muted">Sign in to see your bookings.</p>
              ) : (
                <div className="table">
                  <div className="table-row table-head">
                    <span>ID</span>
                    <span>Vehicle</span>
                    <span>Dates</span>
                    <span>Status</span>
                    <span>Total</span>
                    <span>Action</span>
                  </div>
                  {myBookings.map((booking) => (
                    <div key={booking.id} className="table-row">
                      <span>#{booking.id}</span>
                      <span>{booking.vehicle_id}</span>
                      <span>
                        {booking.start_date} ? {booking.end_date}
                      </span>
                      <span className="tag">{booking.status}</span>
                      <span>${booking.total_price}</span>
                      <span>
                        {booking.status !== 'cancelled' && (
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                  {!myBookings.length && (
                    <p className="muted">No bookings yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="section">
              <h2>Profile</h2>
              {!isAuthed ? (
                <p className="muted">Sign in to edit your profile.</p>
              ) : (
                <>
                  <form className="form" onSubmit={handleProfileUpdate}>
                    <label>
                      Full name
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            full_name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Phone
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      New password
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            password: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button className="primary" type="submit">
                      Save profile
                    </button>
                  </form>
                  <div className="upload-card">
                    <h3>Avatar</h3>
                    <p className="muted">
                      Upload a PNG, JPG, or WEBP profile image.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        event.target.files?.[0] &&
                        handleAvatarUpload(event.target.files[0])
                      }
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'admin-vehicles' && (
            <div className="section">
              <h2>Admin Vehicles</h2>
              {!isAdmin ? (
                <p className="muted">Admin access required.</p>
              ) : (
                <>
                  <form className="form" onSubmit={handleVehicleCreate}>
                    <h3>Add a Vehicle</h3>
                    <div className="columns">
                      <label>
                        Name
                        <input
                          required
                          value={vehicleForm.name}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Type
                        <select
                          value={vehicleForm.type}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              type: event.target.value,
                            }))
                          }
                        >
                          <option value="ev">EV</option>
                          <option value="car">Car</option>
                          <option value="bike">Bike</option>
                        </select>
                      </label>
                      <label>
                        Brand
                        <input
                          value={vehicleForm.brand}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              brand: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Model
                        <input
                          value={vehicleForm.model}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              model: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Year
                        <input
                          type="number"
                          value={vehicleForm.year}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              year: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Daily rate
                        <input
                          type="number"
                          value={vehicleForm.daily_rate}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              daily_rate: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Battery range (km)
                        <input
                          type="number"
                          value={vehicleForm.battery_range_km}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              battery_range_km: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Location
                        <input
                          value={vehicleForm.location}
                          onChange={(event) =>
                            setVehicleForm((prev) => ({
                              ...prev,
                              location: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button className="primary" type="submit">
                      Create vehicle
                    </button>
                  </form>
                  <div className="table">
                    <div className="table-row table-head">
                      <span>Vehicle</span>
                      <span>Rate</span>
                      <span>Location</span>
                      <span>Status</span>
                      <span>Image</span>
                      <span>Action</span>
                    </div>
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="table-row">
                        <span>
                          #{vehicle.id} {vehicle.name}
                        </span>
                        <span>
                          <input
                            type="number"
                            placeholder={vehicle.daily_rate}
                            value={vehicleEdits[vehicle.id]?.daily_rate ?? ''}
                            onChange={(event) =>
                              handleVehicleEditChange(
                                vehicle.id,
                                'daily_rate',
                                event.target.value
                              )
                            }
                          />
                        </span>
                        <span>
                          <input
                            placeholder={vehicle.location || '—'}
                            value={vehicleEdits[vehicle.id]?.location ?? ''}
                            onChange={(event) =>
                              handleVehicleEditChange(
                                vehicle.id,
                                'location',
                                event.target.value
                              )
                            }
                          />
                        </span>
                        <span>
                          <select
                            value={
                              vehicleEdits[vehicle.id]?.is_available ??
                              vehicle.is_available
                            }
                            onChange={(event) =>
                              handleVehicleEditChange(
                                vehicle.id,
                                'is_available',
                                event.target.value === 'true'
                              )
                            }
                          >
                            <option value="true">Available</option>
                            <option value="false">Unavailable</option>
                          </select>
                        </span>
                        <span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              event.target.files?.[0] &&
                              handleVehicleImageUpload(
                                vehicle.id,
                                event.target.files[0]
                              )
                            }
                          />
                        </span>
                        <span className="actions">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleVehicleUpdate(vehicle.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleVehicleDelete(vehicle.id)}
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'admin-bookings' && (
            <div className="section">
              <h2>Admin Bookings</h2>
              {!isAdmin ? (
                <p className="muted">Admin access required.</p>
              ) : (
                <div className="table">
                  <div className="table-row table-head">
                    <span>ID</span>
                    <span>User</span>
                    <span>Vehicle</span>
                    <span>Dates</span>
                    <span>Status</span>
                    <span>Update</span>
                  </div>
                  {adminBookings.map((booking) => (
                    <div key={booking.id} className="table-row">
                      <span>#{booking.id}</span>
                      <span>{booking.user_id}</span>
                      <span>{booking.vehicle_id}</span>
                      <span>
                        {booking.start_date} ? {booking.end_date}
                      </span>
                      <span className="tag">{booking.status}</span>
                      <span>
                        <select
                          value={booking.status}
                          onChange={(event) =>
                            handleAdminStatusUpdate(
                              booking.id,
                              event.target.value
                            )
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="completed">Completed</option>
                        </select>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
