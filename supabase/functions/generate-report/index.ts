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
    const { reportType, startDate, endDate, status, groupBy, skpd } = await req.json(); // Receive new 'groupBy' and 'skpd' parameters

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

    let resultData: any; // This will hold the final data to be returned

    switch (reportType) {
      case 'sumber_dana':
      case 'jenis_tagihan':
        let aggregateQuery = supabaseAdmin
          .from('database_tagihan')
          .select(`${reportType}, jumlah_kotor`);

        if (startDate) aggregateQuery = aggregateQuery.gte('waktu_input', startDate);
        if (endDate) aggregateQuery = aggregateQuery.lte('waktu_input', endDate);
        if (status && status !== 'Semua') aggregateQuery = aggregateQuery.eq('status_tagihan', status);

        const { data: aggregateData, error: aggregateError } = await aggregateQuery;
        if (aggregateError) throw aggregateError;

        const aggregateMap = new Map<string, number>();
        aggregateData.forEach((item: any) => {
          const key = item[reportType] || 'Tidak Diketahui';
          aggregateMap.set(key, (aggregateMap.get(key) || 0) + (item.jumlah_kotor || 0));
        });

        resultData = Array.from(aggregateMap.entries()).map(([name, value]) => ({ name, value }));
        break;

      case 'analisis_skpd': // NEW CASE FOR ANALISIS SKPD
        if (!groupBy) {
          return new Response(JSON.stringify({ error: 'groupBy option is required for analisis_skpd report.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Query for chart data (aggregated)
        let chartQuery = supabaseAdmin
          .from('database_tagihan')
          .select(`${groupBy}, jumlah_kotor`);

        if (startDate) chartQuery = chartQuery.gte('waktu_input', startDate);
        if (endDate) chartQuery = chartQuery.lte('waktu_input', endDate);
        if (skpd && skpd !== 'Semua SKPD') chartQuery = chartQuery.eq('nama_skpd', skpd);

        const { data: chartRawData, error: chartError } = await chartQuery;
        if (chartError) throw chartError;

        const chartMap = new Map<string, number>();
        chartRawData.forEach((item: any) => {
          const key = item[groupBy] || 'Tidak Diketahui';
          chartMap.set(key, (chartMap.get(key) || 0) + (item.jumlah_kotor || 0));
        });
        const chartData = Array.from(chartMap.entries()).map(([name, value]) => ({ name, value }));

        // Query for table data (detailed)
        let tableQuery = supabaseAdmin
          .from('database_tagihan')
          .select('id_tagihan, nama_skpd, nomor_spm, jenis_spm, jenis_tagihan, uraian, jumlah_kotor, status_tagihan, waktu_input, sumber_dana'); // Include sumber_dana

        if (startDate) tableQuery = tableQuery.gte('waktu_input', startDate);
        if (endDate) tableQuery = tableQuery.lte('waktu_input', endDate);
        if (skpd && skpd !== 'Semua SKPD') tableQuery = tableQuery.eq('nama_skpd', skpd);

        tableQuery = tableQuery.order('waktu_input', { ascending: false });

        const { data: tableData, error: tableError } = await tableQuery;
        if (tableError) throw tableError;

        resultData = { chartData, tableData };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid reportType.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    return new Response(JSON.stringify(resultData), {
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