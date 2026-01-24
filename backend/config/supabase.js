const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for backend

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase not configured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment variables.');
}

// Create Supabase client with service role key for backend operations
let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
    supabase = null;
  }
}

// Test connection
const testSupabaseConnection = async () => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    // Test with a simple storage operation
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`📦 Available storage buckets: ${data?.map(b => b.name).join(', ') || 'None'}`);
    
    return { success: true, buckets: data };
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return { success: false, error: error.message };
  }
};

// Initialize buckets if they don't exist
const initializeStorageBuckets = async () => {
  try {
    if (!supabase) {
      
      return;
    }

    const buckets = [
      {
        name: 'pdfs',
        options: {
          public: false,
          allowedMimeTypes: ['application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        }
      },
      {
        name: 'reports',
        options: {
          public: false,
          allowedMimeTypes: ['application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        }
      }
    ];

    for (const bucket of buckets) {
      const { data: existingBucket } = await supabase.storage.getBucket(bucket.name);
      
      if (!existingBucket) {
        const { data, error } = await supabase.storage.createBucket(bucket.name, bucket.options);
        
        if (error) {
          console.error(`❌ Failed to create bucket ${bucket.name}:`, error.message);
        } else {
          
        }
      } else {
        
      }
    }
  } catch (error) {
    console.error('❌ Error initializing storage buckets:', error.message);
  }
};

module.exports = {
  supabase,
  testSupabaseConnection,
  initializeStorageBuckets
};