import { useState } from 'react'
import axios from 'axios'
import ImageUploader from '../EnhancedUploader'

export default function AddNutritionistTab({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    qualification: '',
    experience: '',
    description: '',
    photo: '',
    consultationFee: '500',
    licenseNumber: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState(null)

  const handleImageUpload = (data) => {
    setFormData(prev => ({...prev, photo: data.url}))
    setMessage('Profile picture uploaded successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setMessage('Nutritionist created successfully!')
      setGeneratedCredentials({
        email: formData.email,
        password: formData.password
      })
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
