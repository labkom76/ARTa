import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("--- delete-user Edge Function invoked ---");
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user's authentication and role (only admin can delete)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not found or invalid token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch user's profile to check role
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('peran')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.peran !== 'Administrator') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can delete users.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Ensure service role key is available
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set in Edge Function environment.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Initialize Supabase client with service_role_key for admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      supabaseServiceRoleKey
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Prevent admin from deleting their own account
    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Administrators cannot delete their own account.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    // --- START NEW EXPLICIT DELETION LOGIC ---
    console.log(`Attempting to delete related data for user_id: ${user_id}`);

    // Delete from profiles table
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id);
    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      // Continue to delete other data, but log the error
    } else {
      console.log('Profile deleted successfully.');
    }

    // Delete from database_tagihan table
    const { error: deleteTagihanError } = await supabaseAdmin
      .from('database_tagihan')
      .delete()
      .eq('id_pengguna_input', user_id);
    if (deleteTagihanError) {
      console.error('Error deleting tagihan:', deleteTagihanError);
    } else {
      console.log('Tagihan deleted successfully.');
    }

    // Delete from notifications table
    const { error: deleteNotificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user_id);
    if (deleteNotificationsError) {
      console.error('Error deleting notifications:', deleteNotificationsError);
    } else {
      console.log('Notifications deleted successfully.');
    }

    // Delete from activity_log table
    const { error: deleteActivityLogError } = await supabaseAdmin
      .from('activity_log')
      .delete()
      .eq('user_id', user_id);
    if (deleteActivityLogError) {
      console.error('Error deleting activity logs:', deleteActivityLogError);
    } else {
      console.log('Activity logs deleted successfully.');
    }
    // --- END NEW EXPLICIT DELETION LOGIC ---

    // Now attempt to delete the user from Auth
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthUserError) {
      console.error('Supabase Auth Admin Delete User Error:', deleteAuthUserError);
      return new Response(JSON.stringify({ error: `Failed to delete user from Auth: ${deleteAuthUserError.message || 'Unknown error occurred during deletion.'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'User and related data deleted successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in delete-user Edge Function:', error);
    return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});