import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, Wrench, Gauge, ShieldCheck, Menu, X, Upload, LockKeyhole, Trash2, Check, XCircle, Phone, MapPin, Clock, ChevronDown, ImagePlus, LogOut } from 'lucide-react';
import './styles.css?v=3';

const LOGO_URL = 'https://i.postimg.cc/xCpRKkKx/d5a0e7fe-0b5f-4e47-9069-1714a645ffd1-Picsart-Background-Remover.png';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const staff = [
  { name: 'Employee name', role: 'Mechanic', phone: '00000 000000', image: '' },
  { name: 'Employee name', role: 'Service team', phone: '00000 000000', image: '' }
];

function App() {
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState('home');
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState(null);
  const [pending, setPending] = useState([]);
  const [published, setPublished] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 850);
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
      return () => { clearTimeout(timer); listener.subscription.unsubscribe(); };
    }
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { loadGallery(); }, [session, page]);

  async function loadGallery() {
    if (!supabase) return;
    const { data: live } = await supabase.from('vehicles').select('*').eq('status', 'approved').order('created_at', { ascending: false });
    if (live) {
      const withImages = await Promise.all(live.map(async v => {
        const firstPath = v.image_paths?.[0];
        if (!firstPath) return { ...v, imageUrl: null };
        const { data } = await supabase.storage.from('vehicle-photos').createSignedUrl(firstPath, 3600);
        return { ...v, imageUrl: data?.signedUrl || null };
      }));
      setPublished(withImages);
    }
    if (session) {
      const { data: waiting } = await supabase.from('vehicles').select('*').eq('status', 'pending').order('created_at', { ascending: true });
      setPending(waiting || []);
    }
  }

  function go(to) { setPage(to); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function copyPhone(phone) {
    try { await navigator.clipboard.writeText(phone); setNotice('Phone number copied to clipboard'); }
    catch { setNotice('Please copy this number: ' + phone); }
    setTimeout(() => setNotice(''), 2600);
  }

  async function submitVehicle(e) {
    e.preventDefault();
    if (!supabase) return setNotice('Website setup is not complete yet. Please try again later.');
    const form = new FormData(e.currentTarget);
    const files = Array.from(form.getAll('photos')).filter(f => f && f.size);
    if (!files.length) return setNotice('Please add at least one photograph.');
    if (files.length > 5) return setNotice('Please upload no more than five photographs.');
    if (files.some(f => !f.type.startsWith('image/') || f.size > 8 * 1024 * 1024)) return setNotice('Images must be JPG, PNG or WebP and under 8MB each.');
    setSubmitting(true);
    try {
      // Create the ID in the browser so the anonymous visitor does not need
      // permission to read their pending row back from the database.
      const vehicleId = crypto.randomUUID();
      const paths = [];
      for (const file of files) {
        const path = `${vehicleId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const { error: uploadError } = await supabase.storage.from('vehicle-photos').upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        paths.push(path);
      }
      const { error } = await supabase.from('vehicles').insert({
        id: vehicleId,
        customer_name: form.get('customer_name').trim(),
        make_model: form.get('make_model').trim(),
        year: form.get('year') ? Number(form.get('year')) : null,
        description: form.get('description').trim(),
        status: 'pending',
        image_paths: paths
      });
      if (error) throw error;
      e.currentTarget.reset();
      setNotice('Thanks! Your vehicle has been submitted and will appear after manager approval.');
    } catch (err) {
      setNotice(err.message || 'Sorry, your submission could not be sent.');
    } finally { setSubmitting(false); setTimeout(() => setNotice(''), 6000); }
  }

  async function signIn(e) {
    e.preventDefault();
    if (!supabase) return setNotice('Connect Supabase first. See the setup guide.');
    const f = new FormData(e.currentTarget);
    setLoginBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
    setLoginBusy(false);
    if (error) setNotice('Login failed. Check the manager account details.');
    else { setNotice('Manager signed in'); go('manager'); }
  }

  async function moderate(id, status) {
    const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
    if (!error) { setNotice(status === 'approved' ? 'Vehicle approved' : 'Submission rejected'); loadGallery(); }
    else setNotice(error.message);
    setTimeout(() => setNotice(''), 3000);
  }
  async function removeVehicle(id) {
    if (!window.confirm('Permanently delete this vehicle and its uploaded photos?')) return;
    const item = [...pending, ...published].find(v => v.id === id);
    if (item?.image_paths?.length) await supabase.storage.from('vehicle-photos').remove(item.image_paths);
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) { setNotice('Vehicle deleted'); loadGallery(); } else setNotice(error.message);
    setTimeout(() => setNotice(''), 3000);
  }
  async function signOut() { await supabase.auth.signOut(); go('home'); }

  if (loading) return <div className="loader"><img src={LOGO_URL} alt="Skywheels" /><div className="loader-line"><span /></div></div>;

  return <>
    <header className="header">
      <button className="brand" onClick={() => go('home')} aria-label="Skywheels home"><img src={LOGO_URL} alt="Skywheels logo" /></button>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={menuOpen ? 'nav open' : 'nav'}>
        <button className={page === 'home' ? 'active' : ''} onClick={() => go('home')}>Home</button>
        <button className={page === 'gallery' ? 'active' : ''} onClick={() => go('gallery')}>Customer gallery</button>
        <button className={page === 'team' ? 'active' : ''} onClick={() => go('team')}>Our team</button>
        <button className="nav-cta" onClick={() => go('submit')}>Submit your vehicle <ArrowRight size={16}/></button>
      </nav>
    </header>

    <main>
      {page === 'home' && <Home go={go}/>}
      {page === 'gallery' && <Gallery vehicles={published} go={go} configured={!!supabase}/>}
      {page === 'submit' && <Submit onSubmit={submitVehicle} busy={submitting} configured={!!supabase}/>}
      {page === 'team' && <Team staff={staff} copyPhone={copyPhone}/>}
      {page === 'login' && <Login onSubmit={signIn} busy={loginBusy} configured={!!supabase}/>}
      {page === 'manager' && (session ? <Manager pending={pending} published={published} moderate={moderate} remove={removeVehicle} signOut={signOut}/> : <Login onSubmit={signIn} busy={loginBusy} configured={!!supabase}/>)}
    </main>

    <footer className="footer">
      <div className="footer-main"><img src={LOGO_URL} alt="Skywheels" /><p>Keeping you moving.</p><div className="footer-links"><button onClick={() => go('home')}>Home</button><button onClick={() => go('gallery')}>Gallery</button><button onClick={() => go('team')}>Our team</button><button onClick={() => go('login')}>Manager login</button></div></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Skywheels. All rights reserved.</span><span>Built for the road ahead.</span></div>
    </footer>
    {notice && <div className="toast" role="status">{notice}</div>}
  </>;
}

function Home({ go }) {
  return <>
    <section className="hero">
      <div className="hero-shade"/>
      <div className="hero-content"><span className="eyebrow">SKYWHEELS • AUTOMOTIVE CARE</span><h1>KEEPING YOU<br/><em>MOVING.</em></h1><p>Professional vehicle care, honest advice and a team that puts your car first.</p><div className="hero-actions"><button className="button primary" onClick={() => go('submit')}>Share your vehicle <ArrowRight size={17}/></button><button className="button ghost" onClick={() => go('gallery')}>Explore the gallery</button></div></div>
      <div className="hero-bottom"><span>CARE • CRAFT • CONFIDENCE</span><span>SCROLL TO DISCOVER <ChevronDown size={15}/></span></div>
    </section>
    <section className="intro section-wrap"><div><span className="eyebrow">WELCOME TO SKYWHEELS</span><h2>More than a<br/><em>garage.</em></h2></div><div className="intro-copy"><p className="lead">At Skywheels, we believe every vehicle deserves care, attention and the right people behind the tools.</p><p>We’re building a place where customers can discover our work, share their vehicles and get to know the people who keep them moving.</p><p className="placeholder-note">This introduction is ready to be personalised with Skywheels’ real history, location and story.</p></div></section>
    <section className="feature-band"><div className="feature"><Wrench/><h3>Skilled workmanship</h3><p>Care and attention in every job.</p></div><div className="feature"><Gauge/><h3>Customer-first service</h3><p>Clear communication at every step.</p></div><div className="feature"><ShieldCheck/><h3>Trust you can rely on</h3><p>Putting your vehicle and confidence first.</p></div></section>
    <section className="gallery-promo"><div><span className="eyebrow">THE SKYWHEELS COMMUNITY</span><h2>YOUR CAR.<br/><em>OUR GALLERY.</em></h2><p>Show off your pride and joy. Send us your vehicle and, once approved, it could feature in our customer gallery.</p><button className="button primary" onClick={() => go('submit')}>Submit your vehicle <ArrowRight size={17}/></button></div><div className="promo-photo"/></section>
    <section className="cta-strip"><div><span className="eyebrow">GET TO KNOW US</span><h2>Meet the people behind Skywheels.</h2></div><button className="button ghost" onClick={() => go('team')}>Meet our team <ArrowRight size={17}/></button></section>
  </>;
}

function Gallery({ vehicles, go, configured }) {
  return <PageHero eyebrow="THE SKYWHEELS COMMUNITY" title={<>CUSTOMER<br/><em>GALLERY.</em></>} description="A showcase of the vehicles and people that make the Skywheels community special.">
    <div className="gallery-toolbar"><span>{vehicles.length} {vehicles.length === 1 ? 'VEHICLE' : 'VEHICLES'} FEATURED</span><button className="button primary" onClick={() => go('submit')}>Submit yours <ArrowRight size={16}/></button></div>
    {!configured ? <div className="empty-state"><ImagePlus size={35}/><h3>Gallery coming soon</h3><p>The gallery will appear here once the website database is connected.</p></div> : vehicles.length ? <div className="vehicle-grid">{vehicles.map(v => <article className="vehicle-card" key={v.id}>{v.imageUrl ? <img src={v.imageUrl} alt={v.make_model}/> : <div className="vehicle-placeholder"><Wrench/></div>}<div className="vehicle-info"><span>{v.year || 'SKYWHEELS CUSTOMER'}</span><h3>{v.make_model}</h3><p>{v.description}</p></div></article>)}</div> : <div className="empty-state"><ImagePlus size={35}/><h3>Be the first to feature your vehicle</h3><p>Customer vehicles will appear here after manager approval.</p><button className="button primary" onClick={() => go('submit')}>Submit your vehicle</button></div>}
  </PageHero>;
}

function Submit({ onSubmit, busy, configured }) {
  return <PageHero eyebrow="JOIN THE COMMUNITY" title={<>SHOW US YOUR<br/><em>PRIDE & JOY.</em></>} description="Send us your vehicle details and a few photos. A Skywheels manager will review your submission before it appears in the public gallery.">
    <form className="form-card" onSubmit={onSubmit}>
      <div className="form-heading"><h3>Vehicle submission</h3><span>All fields marked * are required</span></div>
      {!configured && <p className="setup-warning">The site owner must connect the database before submissions can be received.</p>}
      <div className="form-grid"><label>Your name *<input name="customer_name" required maxLength="80" placeholder=""/></label><label>Vehicle make & model *<input name="make_model" required maxLength="100" placeholder=""/></label><label>Year (optional)<input name="year" type="number" min="1900" max="2100" placeholder=""/></label><label className="full">Tell us about your vehicle<textarea name="description" rows="4" maxLength="700" placeholder=""/></label><label className="full upload-label"><span>Vehicle photographs * <small>Up to 5 images, 8MB each</small></span><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required/><span className="upload-hint"><Upload/> Choose photographs from your device</span></label></div>
      <label className="consent"><input type="checkbox" required/> I confirm I have permission to submit these photographs and agree that approved images and vehicle details may be displayed in the Skywheels public gallery.</label>
      <button className="button primary submit-button" disabled={busy || !configured}>{busy ? 'Sending submission…' : 'Send for approval'} <ArrowRight size={17}/></button>
      <p className="privacy-note">Please do not include personal details, number plates or images you do not have permission to share.</p>
    </form>
  </PageHero>;
}

function Team({ staff, copyPhone }) {
  return <PageHero eyebrow="THE PEOPLE BEHIND THE WORK" title={<>MEET THE<br/><em>TEAM.</em></>} description="Get to know the people who help keep Skywheels moving.">
    <div className="team-grid">{staff.map((person, i) => <article className="team-card" key={i}><div className="team-photo">{person.image ? <img src={person.image} alt={person.name}/> : <div className="team-initial">{person.name.split(' ').map(x => x[0]).join('')}</div>}</div><div className="team-info"><span>{person.role}</span><h3>{person.name}</h3><button className="phone-copy" onClick={() => copyPhone(person.phone)}><Phone size={15}/>{person.phone}<span>Copy number</span></button></div></article>)}</div>
    <p className="placeholder-note team-note">Replace the sample names and numbers in <code>src/main.jsx</code> with your real team details and add their photo URLs.</p>
  </PageHero>;
}

function Login({ onSubmit, busy, configured }) {
  return <PageHero eyebrow="RESTRICTED ACCESS" title={<>MANAGER<br/><em>LOGIN.</em></>} description="The private Skywheels management area. Access is reserved for authorised managers.">
    <form className="login-card" onSubmit={onSubmit}><div className="login-icon"><LockKeyhole/></div><h3>Manager access</h3><label>Email address<input name="email" type="email" autoComplete="username" required placeholder="Manager email"/></label><label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Password"/></label><button className="button primary submit-button" disabled={busy || !configured}>{busy ? 'Signing in…' : 'Sign in securely'} <ArrowRight size={17}/></button>{!configured && <p className="setup-warning">Manager login becomes available after Supabase is configured.</p>}</form>
  </PageHero>;
}

function Manager({ pending, published, moderate, remove, signOut }) {
  return <PageHero eyebrow="PRIVATE MANAGEMENT" title={<>MANAGER<br/><em>DASHBOARD.</em></>} description="Review customer submissions and manage the vehicles shown in the public gallery.">
    <div className="manager-top"><div><strong>{pending.length}</strong><span>Pending review</span></div><div><strong>{published.length}</strong><span>Published vehicles</span></div><button className="button ghost" onClick={signOut}><LogOut size={16}/> Sign out</button></div>
    <h3 className="admin-section-title">Awaiting approval</h3>
    {pending.length ? <div className="admin-list">{pending.map(v => <AdminVehicle key={v.id} vehicle={v} pending moderate={moderate} remove={remove}/>)}</div> : <div className="empty-state compact"><Check/><h3>All caught up</h3><p>There are no pending submissions.</p></div>}
    <h3 className="admin-section-title">Published gallery</h3>
    {published.length ? <div className="admin-list">{published.map(v => <AdminVehicle key={v.id} vehicle={v} moderate={moderate} remove={remove}/>)}</div> : <p className="placeholder-note">No published vehicles yet.</p>}
  </PageHero>;
}

function AdminVehicle({ vehicle, pending, moderate, remove }) {
  return <article className="admin-vehicle"><div className="admin-vehicle-main"><div className="admin-thumb"><Wrench/></div><div><h4>{vehicle.make_model}</h4><p>{vehicle.customer_name} {vehicle.year ? `• ${vehicle.year}` : ''}</p><small>{vehicle.description || 'No description provided'}</small></div></div><div className="admin-actions">{pending && <><button className="icon-action approve" title="Approve" onClick={() => moderate(vehicle.id, 'approved')}><Check/></button><button className="icon-action reject" title="Reject" onClick={() => moderate(vehicle.id, 'rejected')}><XCircle/></button></>}<button className="icon-action delete" title="Delete" onClick={() => remove(vehicle.id)}><Trash2/></button></div></article>;
}

function PageHero({ eyebrow, title, description, children }) {
  return <section className="page-section"><div className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</section>;
}

createRoot(document.getElementById('root')).render(<App/>);
