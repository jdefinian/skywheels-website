import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
Deno.serve(async req=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers:cors});
 try{
  const {SUPABASE_URL,SUPABASE_ANON_KEY}=Deno.env.toObject();
  const {username,password}=await req.json();
  if(username!=="manager.skywheels"||typeof password!=="string") return Response.json({error:"Invalid username or password."},{status:401,headers:cors});
  const auth=createClient(SUPABASE_URL!,SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.signInWithPassword({email:"manager.skywheels@skywheels.invalid",password});
  if(error||!data.session) return Response.json({error:"Invalid username or password."},{status:401,headers:cors});
  return Response.json({access_token:data.session.access_token,refresh_token:data.session.refresh_token},{headers:cors});
 }catch{return Response.json({error:"Login could not be completed."},{status:400,headers:cors});}
});
