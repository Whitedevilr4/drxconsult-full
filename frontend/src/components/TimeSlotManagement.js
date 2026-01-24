import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function TimeSlotManagement() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pharmacistId, setPharmacistId] = useState(null);
  const [newSlot, setNewSlot] = useState({
    date: '',
    startTime: '',
    endTime: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Get all pharmacists
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/pharmacists`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Find current pharmacist's data - try multiple matching strategies
      let currentPharmacist = null;
      const userId = user.id || user._id;
      
      // Strategy 1: Match by email (most reliable)
      currentPharmacist = res.data.find(p => {
        const match = p.userId?.email?.toLowerCase() === user.email?.toLowerCase();
        if (match) {
          console.log('✅ Found pharmacist by email match');
        }
        return match;
      });
      
      // Strategy 2: Match by user ID (convert both to strings for comparison)
      if (!currentPharmacist && userId) {
        currentPharmacist = res.data.find(p => {
          const pharmacistUserId = p.userId?._id?.toString();
          const currentUserId = userId.toString();
          const match = pharmacistUserId === currentUserId;
          if (match) {
            console.log('✅ Found pharmacist by user ID match');
          }
          return match;
        });
      }
      
      // Strategy 3: Match by name (case insensitive, exact match)
      if (!currentPharmacist && user.name) {
        currentPharmacist = res.data.find(p => {
          const match = p.userId?.name?.toLowerCase().trim() === user.name?.toLowerCase().trim();
          if (match) {
            console.log('✅ Found pharmacist by name match');
          }
          return match;
        });
      }
      
      // Strategy 4: If only one pharmacist, use that
      if (!currentPharmacist && res.data.length === 1) {
        console.log('✅ Using single pharmacist available');
        currentPharmacist = res.data[0];
      }

      if (currentPharmacist) {
        console.log('✅ Pharmacist found:', currentPharmacist.userId?.name);
        setPharmacistId(currentPharmacist._id);
        setSlots(currentPharmacist.availableSlots || []);
      } else {
        console.error('❌ No pharmacist profile found for user:', user);
        toast.error('Unable to load your pharmacist profile. Please log out and log in again.');
      }
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching slots:', err);
      setLoading(false);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
      setMessage('Please fill all fields');
      toast.warning('Please fill all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const updatedSlots = [
        ...slots,
        {
          date: new Date(newSlot.date).toISOString(),
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          isBooked: false
        }
      ];

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/pharmacists/slots`,
        { slots: updatedSlots },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSlots(updatedSlots);
      setNewSlot({ date: '', startTime: '', endTime: '' });
      setMessage('Slot added successfully!');
      toast.success('Slot added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to add slot');
      toast.error('Failed to add slot');
    }
  };

  const handleDeleteSlot = async (index) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) return;

    try {
      const token = localStorage.getItem('token');
      const updatedSlots = slots.filter((_, i) => i !== index);

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/pharmacists/slots`,
        { slots: updatedSlots },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSlots(updatedSlots);
      setMessage('Slot deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to delete slot');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manage Available Time Slots</h2>

      {message && (
        <div className={`p-4 rounded mb-4 ${
          message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Add New Slot Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Add New Time Slot</h3>
        <form onSubmit={handleAddSlot} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={newSlot.date}
              onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input
              type="time"
              className="w-full px-3 py-2 border rounded"
              value={newSlot.startTime}
              onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input
              type="time"
              className="w-full px-3 py-2 border rounded"
              value={newSlot.endTime}
              onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add Slot
            </button>
          </div>
        </form>
      </div>

      {/* Existing Slots */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Your Available Slots ({slots.length})</h3>
        {slots.length === 0 ? (
          <p className="text-gray-600">No slots available. Add some slots to start receiving bookings.</p>
        ) : (
          <div className="space-y-2">
            {slots
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((slot, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-3 border rounded ${
                    slot.isBooked ? 'bg-gray-100' : 'bg-white'
                  }`}
                >
                  <div>
                    <span className="font-medium">
                      {new Date(slot.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{slot.startTime} - {slot.endTime}</span>
                    {slot.isBooked && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        Booked
                      </span>
                    )}
                  </div>
                  {!slot.isBooked && (
                    <button
                      onClick={() => handleDeleteSlot(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}