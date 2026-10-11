import numpy as np, wave
SR=44100; T=21.5; N=int(SR*T); t=np.arange(N)/SR
rng=np.random.default_rng(7)
def f(n): return 440*2**((n-69)/12)
def lp(x,c):
    a=np.broadcast_to(np.exp(-2*np.pi*np.asarray(c,float)/SR),x.shape); y=np.empty_like(x); s=0.0
    xl=x.tolist(); al=a.tolist(); yl=[0.0]*len(xl)
    for i in range(len(xl)): s=(1-al[i])*xl[i]+al[i]*s; yl[i]=s
    y[:]=yl
    return y
def env(n,a,d): 
    e=np.ones(n); A=max(1,int(a*SR)); e[:A]=np.linspace(0,1,A); e*=np.exp(-np.arange(n)/SR/d) if d else 1; return e
mus=np.zeros(N); fx=np.zeros(N)
def add(buf,sig,start,g=1.0):
    i=int(start*SR); j=min(N,i+len(sig)); buf[i:j]+=g*sig[:j-i]
# pad: Am F C G, 2.4s each, detuned saws lowpassed
chords=[[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]]
pad=np.zeros(N); L=2.4
for k in range(int(np.ceil(T/L))):
    c=chords[k%4]; n=int(L*SR*1.15); tt=np.arange(n)/SR; s=np.zeros(n)
    for m in c:
        for dt in (-0.08,0.08): s+=((tt*f(m-12+dt))%1*2-1)
    e=np.minimum(1,tt/0.5)*np.minimum(1,(L*1.15-tt)/0.4).clip(0)
    add(pad,s*e/8,k*L)
pad=lp(pad,900)
swell=np.interp(t,[0,3.4,6,17.8,18.0,20.3,21.5],[.35,.5,.65,.7,.9,.9,0])
mus+=pad*swell
# sub pulse on 8ths from 3.45
beat=0.6
for k in range(int((T-3.45)/(beat/2))):
    st=3.45+k*beat/2
    if st>20.8: break
    ci=int(st/L)%4; root=chords[ci][0]-24
    n=int(.28*SR); tt=np.arange(n)/SR
    add(mus,np.sin(2*np.pi*f(root)*tt)*np.exp(-tt/.12)*.35,st)
# kick on beats 6.0–17.8 and 18.0–20.4
def kick(st,g=.7):
    n=int(.35*SR); tt=np.arange(n)/SR; fr=50+90*np.exp(-tt/.03)
    add(mus,np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-tt/.14)*g,st)
for k in range(40):
    st=6.0+k*beat
    if st<17.6: kick(st,.55)
for st in np.arange(18.0,20.5,beat): kick(st,.5)
# hats (soft, background) offbeats in highlights
for k in range(40):
    st=6.3+k*beat
    if st<17.6:
        n=int(.05*SR); h=rng.standard_normal(n); h=h-lp(h,6000); add(mus,h*np.exp(-np.arange(n)/SR/.015)*.05,st)
# riser into reveal + impacts
n=int(1.4*SR); tt=np.arange(n)/SR; r=rng.standard_normal(n)
r=lp(r,400+3000*(tt/1.4)**2)*(tt/1.4)**2*.5; add(fx,r,2.0)
def impact(st,g=.8):
    n=int(2.5*SR); tt=np.arange(n)/SR
    s=np.sin(2*np.pi*f(33)*tt)*np.exp(-tt/.6)+.5*np.sin(2*np.pi*f(45)*tt)*np.exp(-tt/.9)
    nz=lp(rng.standard_normal(n),300)*np.exp(-tt/.25)*.8
    add(fx,(s+nz)*g,st)
impact(3.45); impact(18.0,.7)
# plucks in key
def pluck(st,m,g=.18,d=.35):
    n=int(1.2*SR); tt=np.arange(n)/SR
    s=(np.sin(2*np.pi*f(m)*tt)+.3*np.sin(2*np.pi*2*f(m)*tt))*np.exp(-tt/d)*np.minimum(1,tt/.004)
    add(fx,s*g,st)
pluck(0.12,57,.22,.8); pluck(1.32,64,.22,.8)
for i,st in enumerate([6.7,6.88,7.06,7.24]):
    n=int(.03*SR); c=rng.standard_normal(n); c=c-lp(c,2500); add(fx,c*np.exp(-np.arange(n)/SR/.006)*.12,st); pluck(st,81,.04,.06)
pluck(7.75,76,.16); pluck(8.0,72,.12,.6); pluck(8.15,76,.12,.6)
pluck(12.6,76,.16); pluck(12.9,81,.14,.5)
pluck(14.85,69,.12); 
for i,m in enumerate([76,79,81]): pluck(15.15+i*.22,m,.10,.3)
pluck(19.0,76,.12,.8); pluck(19.5,81,.12,1.0)
# reverb on fx (and a touch on music) via feedback combs
def verb(x,mix):
    y=np.zeros_like(x)
    for dl,g in ((.0297,.78),(.0371,.77),(.0411,.75),(.0437,.73)):
        d=int(dl*SR); b=x.copy()
        for i in range(d,len(b),d): b[i:i+d]+=g*b[i-d:i][:len(b[i:i+d])]
        y+=b
    return x*(1-mix)+lp(y/4,4000)*mix
fx=verb(fx,.35); mus=verb(mus,.15)
mix=mus*.8+fx*.9
fade=np.minimum(1,(T-t)/1.0).clip(0)*np.minimum(1,t/.05)
mix=np.tanh(mix*fade*1.1)*.85
st=np.stack([mix,np.roll(mix,int(.008*SR))*0.96+mix*0.04],1)
w=wave.open('audio.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
print('peak',abs(mix).max())
