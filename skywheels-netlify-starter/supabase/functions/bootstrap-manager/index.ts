import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
Deno.serve(async req=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers:cors});
 const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,MANAGER_SETUP_SECRET}=Deno.env.toObject();
 if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!MANAGER_SETUP_SECRET) return Response.json({error:"Server configuration incomplete."},{status:500,headers:cors});
 try{
  const {setup_secret,password}=await req.json();
  if(setup_secret!==MANAGER_SETUP_SECRET) return Response.json({error:"Not authorised."},{status:401,headers:cors});
  if(typeof password!=="string"||password.length<12) return Response.json({error:"Password must be at least 12 characters."},{status:400,headers:cors});
  const admin=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {data:existing}=await admin.from("manager_accounts").select("user_id").limit(1);
  if(existing?.length) return Response.json({error:"Manager already exists."},{status:409,headers:cors});
  const {data,error}=await admin.auth.admin.createUser({email:"manager.skywheels@skywheels.invalid",password,email_confirm:true,user_metadata:{username:"manager.skywheels"},app_metadata:{role:"skywheels_manager"}});
  if(error) throw error;
  const {error:insertError}=await admin.from("manager_accounts").insert({user_id:data.user.id,username:"manager.skywheels"});
  if(insertError){await admin.auth.admin.deleteUser(data.user.id);throw insertError;}
  return Response.json({success:true},{headers:cors});
 }catch(e){return Response.json({error:e.message||"Account creation failed."},{status:500,headers:cors});}
});
