import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, startDate, endDate, status } = await req.json(); // Receive new 'status' parameter

    if (!reportType) {
      return new Response(JSON.stringify({ error: 'reportType is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service_role_key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query;
    let data;
    let error;

    switch (reportType) {
      case 'sumber_dana':
        query = supabaseAdmin
          .from('database_tagihan')
          .select('sumber_dana, jumlah_kotor');

        if (startDate) query = query.gte('waktu_input', startDate);
        if (endDate) query = query.lte('waktu_input', endDate);
        if (status && status !== 'Semua') query = query.eq('status_tagihan', status); // Apply status filter

        ({ data, error } = await query);

        if (error) throw error;

        const sumberDanaMap = new Map<string, number>();
        data.forEach((item: any) => {
          const sd = item.sumber_dana || 'Tidak Diketahui';
          sumberDanaMap.set(sd, (sumberDanaMap.get(sd) || 0) + (item.jumlah_kotor || 0));
        });

        data = Array.from(sumberDanaMap.entries()).map(([name, value]) => ({ name, value }));
        break;

      case 'jenis_tagihan':
        query = supabaseAdmin
          .from('database_tagihan')
          .select('jenis_tagihan, jumlah_kotor');

        if (startDate) query = query.gte('waktu_input', startDate);
        if (endDate) query = query.lte('waktu_input', endDate);
        if (status && status !== 'Semua') query = query.eq('status_tagihan', status); // Apply status filter

        ({ data, error } = await query);

        if (error) throw error;

        const jenisTagihanMap = new Map<string, number>();
        data.forEach((item: any) => {
          const jt = item.jenis_tagihan || 'Tidak Diketahui';
          jenisTagihanMap.set(jt, (jenisTagihanMap.get(jt) || 0) + (item.jumlah_kotor || 0));
        });

        data = Array.from(jenisTagihanMap.entries()).map(([name, value]) => ({ name, value }));
        break;

      case 'detail_skpd':
        query = supabaseAdmin
          .from('database_tagihan')
          .select('id_tagihan, nama_skpd, nomor_spm, jenis_spm, jenis_tagihan, uraian, jumlah_kotor, status_tagihan, waktu_input');

        if (startDate) query = query.gte('waktu_input', startDate);
        if (endDate) query = query.lte('waktu_input', endDate);
        // Status filter is NOT applied for 'detail_skpd' as per instructions

        query = query.order('nama_skpd', { ascending: true });

        ({ data, error } = await query);
        if (error) throw error;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid reportType.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in generate-report Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});