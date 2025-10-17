import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Definisikan corsHeaders langsung
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log("--- Transfer Data Invocation ---");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sourceUserId, targetUserId } = await req.json();
    console.log("Transferring data from:", sourceUserId, "to:", targetUserId);

    if (!sourceUserId || !targetUserId) {
      throw new Error("ID Pengguna Sumber atau Tujuan tidak ditemukan.");
    }
    if (sourceUserId === targetUserId) {
        throw new Error("Pengguna Sumber dan Tujuan tidak boleh sama.");
    }

    // Buat Supabase admin client untuk melewati RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // UPDATE data tagihan: ganti id_pengguna_input dari source ke target
    const { data, error } = await supabaseAdmin
      .from('database_tagihan')
      .update({ id_pengguna_input: targetUserId })
      .eq('id_pengguna_input', sourceUserId);

    if (error) {
      console.error("Database update error:", error);
      throw error;
    }

    console.log("Update successful, data:", data); // Data biasanya null untuk update
    return new Response(JSON.stringify({ success: true, message: "Data berhasil ditransfer." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("!!! ERROR CAUGHT:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});