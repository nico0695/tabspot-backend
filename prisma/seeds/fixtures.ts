export interface ChordProFixture {
  artistSlug: string;
  songSlug: string;
  songTitle: string;
  content: string;
}

export const FIXTURES: readonly ChordProFixture[] = [
  {
    artistSlug: 'almafuerte',
    songSlug: 'se-vos',
    songTitle: 'Se vos',
    content: `{title: Se Vos}
{artist: Almafuerte}

{comment: Intro}
{start_of_tab}
E|-----------------2----0---------------------------2----|
B|--------1--------3----1-----------1---------------3----|
G|--2---2----0-----2----2-----2---2----4--4/5--5----2----|
D|----2------0-----0----2-------2------5-----------------|
A|-----------2----------0--------------5-----------------|
E|-----------3-------------------------3-----------------|
{end_of_tab}
[Am] [G] [D] [Am]
[Am] [G] [F] [D]

{start_of_verse}
Vamos che por que dejar
que tus sueños se desperdicien
si no sos vos triste será
si no sos vos será muy triste...
{end_of_verse}

{start_of_bridge}
{comment: Puente}
[F] [G] [F] [G] [Am]
{end_of_bridge}

{start_of_chorus}
[Am]Por que fal[F]sear
[Am]si ser uno es ga[G]nar
[D]por que enga[C]ñarse y [G]men[Am]tirse... [F]
[Am]se vos no [F]mas
[Am]que al mundo salva[G]ras
[D]aunque mu[C]chos lo [G]hagan di[Am]ficil...
{end_of_chorus}

{comment: Intro}
[Am] [G] [D] [Am] [Am] [G] [F] [D]

{start_of_verse}
Sigamoslo como hasta aca
prometiendome que lo entendiste
digamos fue, si algo anda mal
cumple sus sueños quien resiste...
{end_of_verse}

{start_of_bridge}
{comment: Puente}
[F] [G] [F] [G] [Am]
{end_of_bridge}

{start_of_chorus}
[Am]Yo se di[F]ras
[Am]muy duro es aguan[G]tar
[D]mas quien aguan[C]ta es el que e[G]xis[Am]te... [F]
[Am]si aquel se [F]va
[Am]no llores ni mi[G]res atras
[D]aunque mu[C]chos te lo [G]hagan [Am]triste... [F] [Am] [C] [D]
{end_of_chorus}

{comment: Solo de guitarra}

{start_of_verse}
Se vos no mas
Que al mundo salvarás
por que engañarse y mentirse...
yo se diras
muy duro es aguantar
mas quien aguanta es el que existe...
Por que falsear
si ser uno es ganar
aunque muchos te lo hagan triste...
si aquel se va
no llores n mires atras
la vida busca instruirte...
{end_of_verse}`,
  },
  {
    artistSlug: 'almafuerte',
    songSlug: 'tu-eres-su-seguridad',
    songTitle: 'Tu eres su seguridad',
    content: `{title: Tu eres su seguridad}
{artist: Almafuerte}

{comment: Intro}
{start_of_tab}
e|-----------------------------------------------------------------|
B|-----------------------------------------------------------------|
G|-----------------------------------------------------------------|
D|-9-9-12-11--12--9-9-12--7-7-9--9-9-12-11--12--5------------------|
A|-7-7-10--9--10--7-7-10--5-5-7--7-7-10--9--10--3--------2---------|
E|--------------------------------------------------3-2-3---3-2----|

e|---------------------------------------------------------------|
B|-------------------------------------------------------------- |
G|---------------------------------------------------------------|
D|-9-9-12-11--12--9-9-12--7-7-9--9-9-12-11--12--5----------------|
A|-7-7-10--9--10--7-7-10--5-5-7--7-7-10--9--10--3--------2-----3-|
E|-------------------------------------------------3-2-3---3-2---|

A|--------2------|
E|--3-2-3---3-2--|
{end_of_tab}

{comment: SOLO DE BATA}

{comment: FILL 1}
{start_of_tab}
D|-------0------|
A|--------------|
E|-3-2-3---3-2--|
{end_of_tab}

{comment: RIFF 1 (x2)}
{start_of_tab}
e|------------------------------------------|
B|------------------------------------------|
D|------------------------------------------|
G|--9--5-7---12-10-9-----5------------0-----|
A|--7--3-5---10-9--7-----3--7---------------|
E|--------------------------5---3-2-3---3-2-|
{end_of_tab}

{start_of_verse}
[MI5]AJENO AL [DO5]TIEMPO [RE5]SE QUE QUI[SOL5]SIERA [FA#5]SE[SOL5]GUIR[FA#5] [MI5]
[MI5]PERO MIL VOCES TE [DO5]AHOGAN PARA QUE FORMES LA [RE5]COLA DEL SEGURO POR VE[MI5]NIR
[MI5]POR ESO TE [DO5]VI ESCAPANDO EN LAS [RE5]HORAS SIN [SOL5]SOL [FA#5] [SOL5] [FA#5] [MI5]
[MI5]DE LAS MIRADAS OS[DO5]CURAS QUE APROVARON LAS TOR[RE5]TURAS DEL FUGADO REPRE[MI5]SOR
[LA5]SON QUIENES NO AL[SI5]CANZAN LA PAZ [DO5]
[RE5]POR SUS VIEJOS MIEDOS [RE5]-[DO5]-[SI5]
[SI5]Y HOY ESPERAN DE [DO5]VOS SEGURI[RE5]DAD
[SI]DE VOS
{end_of_verse}

{comment: RIFF 1}

{start_of_verse}
[MI5]QUE NO TE DE[DO5]MORE EL MUNDO NO, [RE5]PONIENDOTE EL AN[SOL5]TIFAZ[FA#5] [SOL5] [FA#5] [MI5]
[MI5]Y BUSCANDO ACOMO[DO5]DARTE EN MEDIO DEL DE[RE5]RRUMBE DE SU DECADEN[MI5]CIA
[MI5]PUES LA ENFERMANTE IS[DO5]TERIA QUE HAY A SU AL[RE5]REDEDOR [SOL5] [FA#5] [SOL5] [FA#5] [MI5]
[MI5]TRTARA DE AGO[DO5]TARTE PARA QUE FORMES [RE5]PARTE DE SU INDIGESTI[MI5]ON
[LA5]Y E SU [SI5]FALSO A[DO5]MOR
[RE5]PADECEN DE PASION [RE5]-[DO5]-[SI5]
[SI5]ANTES DE ARREPEN[DO5]TIRSE DE SU ER[RE5]ROR
[SI]DE VOS
{end_of_verse}

{start_of_chorus}
[MI]MATA EL MIEDO QUE [DO5]GUARDA EL ANI[RE5]MAL [MI5]
[MI]LIMPIA EL CUERPO PUES [DO5]DENTRO DE EL ES[RE5]TAS [MI5]
[LA5]SI BUSCAS LIBER[SI5]TAD YA NO [DO5]ANDES POR [RE5]FUERA NO [RE5]-[DO5]-[SI5]
[SI5]HOMBRE DE MIL NOMBRES [DO5]NACE YA NACE YA NACE [RE5]YA
{end_of_chorus}

{comment: SOLO DE GUITARRA}
{comment: RIFF 1 x2}

{start_of_chorus}
{comment: Estribillo}
[MI]MATA EL MIEDO QUE [DO5]GUARDA EL ANI[RE5]MAL [MI5]
[MI]LIMPIA EL CUERPO PUES [DO5]DENTRO DE EL ES[RE5]TAS [MI5]
[LA5]SI BUSCAS LIBER[SI5]TAD YA NO [DO5]ANDES POR [RE5]FUERA NO [RE5]-[DO5]-[SI5]
[SI5]HOMBRE DE MIL NOMBRES [DO5]NACE YA NACE YA NACE [RE5]YA
{end_of_chorus}

{comment: Outro}
{start_of_tab}
e|------------------------------------------------|
B|------------------------------------------------|
D|------------------------------------------------|
G|---------0------9-9--11-11--12-12--9-9--7-7-----|
A|----------------7-7--9--9---10-10--7-7--5-5-----|
E|---3-2-3---3-2----------------------------------|

e|------------------------------------------------|
B|------------------------------------------------|
D|------------------------------------------------|
G|------------0-------------------------2---------|
A|--------------------------------------2---------|
E|---3--2--3-----3--2----3--2--0--------0---------|
{end_of_tab}`,
  },
  {
    artistSlug: 'intoxicados',
    songSlug: 'mi-inteligencia-intrapersonal',
    songTitle: 'Mi inteligencia intrapersonal',
    content: `{title: Mi inteligencia intrapersonal}
{artist: Intoxicados}

{comment: Intro}
[G] [C] {comment: x2} [D]

{start_of_verse}
[G]Cuando veo que [C]nada está bien y [G]siento
[C]que me empiezo a per[D]der, me alejo {comment: Riff}
[G]No digo que no [C]quiera cambiar
[G]Pero se hace [C]dificil dejar el ve[D]neno, lo sabes bien
{end_of_verse}

{comment: Intro}

{start_of_verse}
[G]Mi inteligencia intra[C]personal
[G]nunca ha [C]sido la mejor de éste [D]pueblo
[G]Y todos los con[C]sejos que me [G]das
[C]Me ayudan pero [D]solo no puedo
{end_of_verse}

{start_of_chorus}
[B5] [C5] [D5]Me la paso tratando de poder za[B5]far [C5]
[D5]Busco estar bien y consigo estar [B5]mal [C5]
[D5]Nunca llego donde quiero lle[B5]gar [C5]
[D5]Mi sangre se enfria, el feeling se [B5]va [C5]
[D5]Vos aca, [B5] [C5] [D5]yo allá, [B5] [C5] [D5]así nunca nos vamos a poder encontrar
{end_of_chorus}

{start_of_bridge}
[G] [C] {comment: x2}
[D]Yo cre que no {comment: x2}
{end_of_bridge}

{start_of_verse}
[G]Y todos los con[C]sejos que me [G]dan
[C]me ayudan pero [D]solo no puedo
{end_of_verse}

{start_of_chorus}
[B5] [C5] [D5]Y me digo: amigo, es hora de sa[B5]lir [C5]
[D5]El juego se acaba, cuanto tiempo per[B5]dí [C5]
[D5]Todos se quedaron, yo me quise [B5]ir [C5]
[D5]ofrecieron llevarme pero quise se[B5]guir [C5]
[D5]Vos aca, [B5] [C5] [D5]yo allá [B5] [C5]
[D5]Asi nunca nos vamos a poder enconrtrar...
{end_of_chorus}

{comment: Final}
[G] [C] {comment: x2}
[D]...yo creo que no...

{comment: Riff}
{start_of_tab}
e-----------------------
b-----------------------
g-----------------------
d-----------------------
a--2-2-2-3-5-3-2--------
e----------------3------
{end_of_tab}`,
  },
  {
    artistSlug: 'intoxicados',
    songSlug: 'nunca-quise',
    songTitle: 'Nunca quise',
    content: `{title: Nunca Quise}
{artist: Intoxicados}

{comment: Intro}
[Bm] [C#m] [F#m] [Bm] [E] [A] [A7]

{start_of_verse}
[D]Nunca quise tanto a nadie [Bm]como vos
[C#m]Por eso es que empiezo a du[F#m]dar
[Bm]Si seremos hermanos que nos sepa[E]raron
[A]Y nosotros sin saberlo nos vol[A7]vimos a juntar
{end_of_verse}

{start_of_verse}
[D]Tu sangre es roja, la mía tam[Bm]bién
[C#m]Pero no me equivoco, algo ten[F#m]dremos que ver
[Bm]Somos indios latinos con guitarra e[E]léctrica
[A]Y comunicados a través de In[A7]ternet
{end_of_verse}

{start_of_chorus}
[D]Para o[E]diar hay que que[A]rer
[D]Para des[E]truir hay que ha[A]cer
[D]Y estoy or[E]gulloso de que[A]rerte rom[F#m]per
[Bm]La cabeza contra la pa[E]red
{end_of_chorus}

{start_of_verse}
[D]Y por todas esas cosas que tenemos en co[Bm]mún
[C#m]Hace tiempo ya marchaste de a[F#m]cá
[Bm]Te cansaste de mi, yo me canse de [E]vos
[A]Pero cuando nos miramos sabe[A7]mos que no es verdad
{end_of_verse}

{start_of_verse}
[D]Porque tanto te quise y tanto te [Bm]quiero
[C#m]Siempre una marca tuya llevará mi cora[F#m]zón
[Bm]Disculpa si te parece [E]raro
[A]Pero comparto la opinión que escuché en una canción: Let It Be
{end_of_verse}

{start_of_verse}
[D]Si la amas dé[Bm]jala ser, si la [C#m]quieres déjala vo[F#m]lar
[Bm]Nunca fui tu patrón, no quisiera cam[E]biarte
[A]y no quiero que pierdas tu personali[A7]dad
{end_of_verse}

{start_of_chorus}
[D]Para o[E]diar hay que que[A]rer
[D]Para des[E]truir hay que ha[A]cer
[D]Y estoy or[E]gulloso de que[A]rerte rom[F#m]per
[Bm]La cabeza contra la pa[E]red
{end_of_chorus}

{start_of_chorus}
[D]Para de[E]jar hay que be[A]ber
[D]Para mo[E]rir primero hay que na[A]cer
[D]Siento ganas nueva[E]mente de ti[A]rarme a tus [F#m]pies
[Bm]Y llevarte a mi morada otra [E]vez
{end_of_chorus}

{comment: Punteo Base x2}
[D] [E] [A] [D] [E] [A] [D] [E] [A] [F#m] [Bm] [E]

{start_of_chorus}
[D]Para o[E]diar hay que que[A]rer
[D]Para des[E]truir hay que ha[A]cer
[D]Y estoy or[E]gulloso de que[A]rerte rom[F#m]per
[Bm]La cabeza contra la pa[E]red
{end_of_chorus}

{start_of_chorus}
[D]Para de[E]jar hay que be[A]ber
[D]Para mo[E]rir primero hay que na[A]cer
[D]Siento ganas nueva[E]mente de ti[A]rarme a tus [F#m]pies
[Bm]Y llevarte a mi morada otra [E]vez
{end_of_chorus}

{start_of_chorus}
[D]Si lo sem[E]brás lo reco[A]ges
[D]Y si espe[E]rás vas a enten[A]der
[D]Cuando las [E]cosas salen [A]como no las es[F#m]pero,
[Bm]La vida me hace mas gue[E]rrero.
{end_of_chorus}`,
  },
  {
    artistSlug: 'intoxicados',
    songSlug: 'religion',
    songTitle: 'Religion',
    content: `{title: Religión}
{artist: Intoxicados}

{comment: Intro}
[RE5] [LA#5] [DOM5] [LA] {comment: x2 + Riff x2}

{start_of_tab}
---------------------------------------------------------
---------------------------------------------------------
---------------------------------------------------------
------3-2-0-/-----3-2-0-3-2--/------/--------------------
--4-5-------/-4-5----------1-/1-2-3-/-3-5-3-6-3-5-3---5--
------------/----------------/------/---------------5---5
{end_of_tab}

{start_of_verse}
[RE5]poco a poco pude notar
[LA#5]que en la vida hay mas de una realidad
[DOM5]cada casa es un mundo,
cada mente un planeta
[LA5]donde tus ideas forman tu personalidad
{end_of_verse}

{start_of_verse}
Nada esta bien nada esta mal
todo es distinto es tu forma de pensar
no estoy arrepentido por lo que hice ayer
pero lo que no te gusto
voy a tratar de cambiar
{end_of_verse}

{start_of_verse}
Muchos confunden la felicidad
con todas esas cosas que no pueden comprar
yo no se si sera la televisión
que les muestra un culo que no pueden tocar
{end_of_verse}

{start_of_verse}
Mis amigos, mi familia, mi perro y el sol
son las cosas que yo tengo como religión
la vida es tan sencilla pero algunos no lo ven
y solo buscan subirse a un marcedes benz
{end_of_verse}

{start_of_chorus}
[SOL5]cual es la diferencia entre un remisero,
[LA#5]un obrero, un profesor de facultad
[DOM5]un cantante de rock,el que vende estampitas
[LA5]vivir en el campo o vivir en la ciudad
{end_of_chorus}

{start_of_chorus}
[LA5]si da lo mismo ser linyera que millonario
[LA#5]robar toda la vida o salir a laburar
[DOM5]ser lindo,ser feo,ser bueno,ser malo
[LA5]lo importante es si supiste disfrutar
{end_of_chorus}`,
  },
  {
    artistSlug: 'la-renga',
    songSlug: 'arte-infernal',
    songTitle: 'Arte infernal',
    content: `{title: Arte Infernal}
{artist: la Renga}

{comment: Intro x4}
{start_of_tab}
e -----------------------------------------]
b -----------------------------------------]
g ---------------------2--2--2--2----------]
d ---------------------2--2--2--2----------]
a ---------------------0--0--0--0----------]
E -0--3-4---0--3-4--0----------------------]
{end_of_tab}

{start_of_verse}
[E]Ese adios te rompio en pe[F#m]dazos,
[A]Tus ganas de se[E]guir.
[Em]El que sabe que ya no hay [F#m]caso,
[A]Esta dispuesto a su[E]frir.
Las cuestiones de los fracasos,
Siempre fueron asi.
No quieres dormir en otros brazos,
si te dan a elegir.
{end_of_verse}

{start_of_chorus}
[D5]Los tallos de esa [A5]rosa
[D5]Siempre van a las[A5]timar,
[D5]Dios las hizo tan her[A5]mosas,
[B5]Con un arte in[D5]fer[Em]nal.
{end_of_chorus}

{comment: Intro x4}
{comment: Solo: sobre estrofas y coro.}

{start_of_verse}
A un buen recurso apuestan los hombres
antes de decidir
Esa botella no tiene nombre
y ahora me toca a mi.
Pero todo no termina tan pronto
aun que lo creas asi
es el final y siempre empieza todo
con el riesgo al vivir.
{end_of_verse}

{comment: Coro}

{comment: Final: Intro}`,
  },
  {
    artistSlug: 'la-renga',
    songSlug: 'en-el-baldio',
    songTitle: 'En el baldio',
    content: `{title: En el baldío}
{artist: la Renga}

{start_of_verse}
[SOL5]las garras de un terrible ser {comment: riff 1}
[MI5]desplumaban un angel en el [RE5]cielo
[MI5]desde aqui lo vi ca[SOL5]er {comment: riff 1}
[MI5]hacia el baldio de los mis[RE5]terios
[MI5]yo corri desespe[SOL5]rado {comment: riff 1}
[MI5]senti el ardor de una herida a[RE5]bierta
[MI5]esta el angel ahi ti[SOL5]rado {comment: riff 1}
[MI5]y en sus ojos habló la tris[RE5]tesa
{end_of_verse}

{start_of_chorus}
[SOL5]no me mires a[RE5]sí [RE#5] [MI5] {comment: en el 7 trate,cuerda 5}
[MI5]dios me ha hecho para ca[DO5]er
[SOL5]y no sientas pena por [RE]mi [RE#5] [MI5]
[MI5]talvez vivir cueste el pe[DO5]cado
[SOL5]y si todo lo so[RE]ñado [RE#5] [MI5]
[MI5]lo vive en la reali[DO5]da
[SOL5]es el angel que te cuida el que [RE5]vas caido aca {comment: riff 2}
{end_of_chorus}

{start_of_tab}
riff 1:
1---------]
2---------]
3---------]
4---------]
5------0--]
6-3-2-----]
{end_of_tab}

{start_of_tab}
riff 2:
1-----------------------------------------------]
2-----------------------------------------------]
3-----------------------------------------------]
4-----------------------------------------------]
5-----------------7-5-3-2-3-3-2---5h7p5-3-5-----]
6-0-3-5-6-7-mi5----------------5-3---------rem--]
{end_of_tab}

{comment: vuelve a empezar}

{start_of_verse}
las espinas del cardo santo
lo abrazaron en su caida
y entre saumerios de basura
el angel aquel se moría
se hunde un vasio a mis espaldas
y sentí que solo me quedaba
en el baldio de los misterios
con ojos tristes que me hablablan
{end_of_verse}

{start_of_chorus}
no me mire así...
{end_of_chorus}

{comment: al final hace lento el riff 1}`,
  },
  {
    artistSlug: 'la-renga',
    songSlug: 'la-nave-del-olvido',
    songTitle: 'La nave del olvido',
    content: `{title: La Nave del Olvido}
{artist: la Renga}

{start_of_tab}
Riff 1 :::
1)------------
2)------------
3)------------
4)--4--2--0---
5)------------
6)------------
{end_of_tab}

{start_of_tab}
Riff 2 :::
1)------------
2)------------
3)------------
4)------------
5)--4--2---0--
6)------------
{end_of_tab}

{start_of_verse}
[SOL]Hoy voy a bai[RE]lar {comment: Riff 1}
[SOL]a la nave del ol[RE]vido {comment: Riff 1}
[SOL]olvido mi go[RE]tera {comment: Riff 1}
[SOL]y mi racion crimi[RE]nal {comment: Riff 1}
{end_of_verse}

{start_of_chorus}
[DO]Perfumes baratos, ambientes pi[SOL]cados
[DO]discos rayados, ya quiero despe[RE]gar.
{end_of_chorus}

{start_of_verse}
[RE]Hoy voy a bai[LA]lar {comment: Riff 2}
[RE]a la Nave del Ol[LA]vido, {comment: Riff 2}
[RE]olvido mis her[LA]manos, {comment: Riff 2}
[RE]y estampitas de esta[LA]cion. {comment: Riff 2}
{end_of_verse}

{start_of_bridge}
[SOL]Veni morocha que vamos a [RE]dar
[SOL]una vuelta al chape[LA]rio.
[SOL]La Perito esta desierta y la [RE]luna
[LA]que se ha posado sobre los [SIm]techos... [SIm] [LA] [SOL] [SOL#m] [LA]
de pompeya.
{end_of_bridge}

{comment: Solo}
[RE]

{start_of_verse}
Hoy voy a bailar,
a la nave del olvido,
olvido a mis hermanos,
y mi racion criminal.
{end_of_verse}

{start_of_chorus}
Zapatos embarrados, vuelvo algo mareado
esquivando charcos no logro despertar.
{end_of_chorus}

{start_of_bridge}
La Perito sigue desierta y el sol
que hizo invisible a la luna de Pompeya.
La Perito sigue desierta y el sol
que se ha posado sobre los techos
de Pompeya.
{end_of_bridge}`,
  },
  {
    artistSlug: 'la-renga',
    songSlug: 'panic-show',
    songTitle: 'Panic show',
    content: `{title: Panic show}
{artist: la Renga}

{start_of_verse}
[E]¡Hola a todos! yo soy el león,
[A]rugió la bestia en medio [E]de la avenida,
todos corrieron, sin entender,
[A]panic show a plena [E]luz del día.
{end_of_verse}

{start_of_chorus}
[C]Por favor no huyan [G]de mí,
[D]yo soy el rey [A]de un [G]mundo per[E]dido,
[C]soy el rey y te [G]destrozaré,
[D]todos los cómplices [A]son [G]de mi ape[E]tito.
{end_of_chorus}

{start_of_verse}
¡No te escapes! ven a mí,
desnúdate y enfrenta mis dientes
yo soy el rey, el león,
ven a saber lo que se siente.
{end_of_verse}

{start_of_chorus}
Por favor no huyan de mí,
yo soy el rey de un mundo perdido,
soy el rey y te destrozaré,
todos los cómplices son de mi apetito.
{end_of_chorus}`,
  },
  {
    artistSlug: 'los-fabulosos-cadillacs',
    songSlug: 'el-satanico-dr-cadillac',
    songTitle: 'El satanico dr cadillac',
    content: `{title: el Satánico Dr. Cadillac}
{artist: los Fabulosos Cadillacs}

{start_of_verse}
[DOm]Voy a tomar por vos, otro trago para olvidar
[SOL]que el miedo te comio los pies
[RE]y que ahora sos un tipo mas
[RE] [SOLm]y que poco a poco te fuiste yendo
y que poco a poco te fuiste yendo de nuestro lugar
[DOm]Te sienta bien el sol, te sienta bien ser cool
[SOLm]te sienta bien el mar, te sienta bien ser Dios
[RE]te sienta bien mentir, y decir,
[SOLm]que te fuiste yendo de nuestro lugar
{end_of_verse}

{start_of_chorus}
[RE#]Que es lo que ha pasado con tu corazon
ya no marca el paso que marcaba ayer
[SIb]nunca fuiste libre y esa es la razon
siempre hay un idiota para convencer
[DOm]hablas toda la noche como un boy scout
hablas sobre mi vida como tu papa
[RE]Los Cadillacs tocando para vos
los Cadillacs tocando para vos
los Cadillacs tocando para vos
los Cadillacs tocando para vos
{end_of_chorus}

{comment: Repite Coro (B)}
{comment: Repite Verso (A)}
{comment: Repite Coro (B)}`,
  },
  {
    artistSlug: 'los-fabulosos-cadillacs',
    songSlug: 'los-caminos-de-la-vide',
    songTitle: 'Los caminos de la vide',
    content: `{title: Los caminos de la vida}
{artist: los Fabulosos Cadillacs}

{start_of_tab}
1E||-0-0-5-5-8-8-12--8-12-12-8-12-12-10--7-10-10-7-10-10-8--5-8-8-5-8-13-12-||
2B||------------------------------------------------------------------------||
{end_of_tab}

{start_of_chorus}
[Am]Los caminos de la vida
[G]no son lo que yo esperaba,
[F]no son lo que yo creía,
[C]no son los que imaginaba.
[Am]Los caminos de la vida
[G]son muy difícil de andarlos,
[F]difíciles de caminarlos,
[C]y no encuentro la salida.
{end_of_chorus}

{start_of_verse}
[Am]Yo pensaba que la vida
[G]era distinta,
y cuando era chiquitito,
[F]yo creía que las cosas
[C]eran fáciles como ayer.
{end_of_verse}

{start_of_verse}
[Am]Que mi madre preocupada,
[G]se esmeraba
por darme todo lo que
[F]nececitaba,
y hoy me doy cuenta
[C]que tanto así no es.
{end_of_verse}

{start_of_verse}
[C]Porque a mi madre
[C]la veo cansada,
[C]de trabajar por mi hermano
[G]y por mi.
[G]Y ahora con ganas
[G]quisiera ayudarla,
[G]y por ella la peleo
[G]hasta el [C]fin.
{end_of_verse}

{start_of_verse}
[C]Por ella lucharé
[C]hasta que me muera,
[C]y por ella
[C]no me quiero mo[G]rir.
[G]Tampoco que
[G]se me muera mi vieja,
[G]pero yo se
[G]que el destino es a[C]sí.
{end_of_verse}`,
  },
  {
    artistSlug: 'los-fabulosos-cadillacs',
    songSlug: 'yo-no-me-sentaria-en-tu-mesa',
    songTitle: 'Yo no me sentaria en tu mesa',
    content: `{title: Yo no me sentaría en tu mesa}
{artist: los Fabulosos Cadillacs}

{comment: Intro}
[C] [Am] [F] [G] {comment: x2}

{start_of_verse}
[C]Por mas que quieras sacarnos de nuestro lu[Am]gar
[F]y piensen que solo somos un pu~ado de i[G]diotas,
[C]no, no podras quitarnos lo que hicimos [Am]ya,
[F]ahora somos mas hermanos que [G]antes.
{end_of_verse}

{start_of_verse}
Ya no podras mirarnos a los ojos mas,
nosotros somos amigos vos que solo estas,
por mas que quieras tapar toda nuestra voz,
nunca podras callar esta cancion
{end_of_verse}

{comment: Intro}

{start_of_verse}
Y si despues no crees lo que te estoy diciendo,
mira mis pies bailando al son de este ritmo,
voy a vestirme de traje aunque me veas mal,
voy a saltar toda la noche sin parar de silbar
{end_of_verse}

{start_of_verse}
Esta lloviendo pero yo no me voy mojar,
mis amigos me cubren cuando voy a llorar,
por mas que quieras tapar toda nuestra voz,
nunca podras callar esta cancion
{end_of_verse}`,
  },
  {
    artistSlug: 'los-pericos',
    songSlug: 'runaway',
    songTitle: 'Runaway',
    content: `{title: Runaway}
{artist: Los Pericos}

{comment: Intro}
{start_of_tab}
G |----------------|----------------|----------------|----------------|
D |----------------|--------44----4-|----------------|--------44----4-|
A |5---5--5-----45-|7---7--7---4-7--|5---5--5-----45-|7---7--7---4-7--|
E |--------55-5----|----------------|--------55-5----|----------------|
{end_of_tab}

{comment: Intro Chords}
[D] [A] [E] [F#m] {comment: x2}

{start_of_verse}
[D]Cuídame bi[A]en, [E]pues lo mio es se[F#m]rio
[D]Quiero que es[A]tés, [E]a mi lado esta [F#m]vez
[D]Voy a fu[A]mar, [E]mientras te es[F#m]pero
[D]Voy a for[A]mar, [E]un espacio me[F#m]jor.
{end_of_verse}

{start_of_chorus}
{start_of_tab}
|----------------|----------------|----------------|----------------|
|----------------|----------------|----------------|----------------|
|----------------|----------------|----------------|----------------|
|--4-7--7----7--7|--6-9--9--------|--4-7--7----7--7|--6-9--9--------|
|5---------4-----|7---------6-9---|5---------4-----|7---------6-9---|
|--------5-------|--------7-------|--------5-------|--------7-------|
{end_of_tab}

[D]Run, run, run, runa[A]way, [E]away[F#m]
[D]Run, run, run, runa[A]way, [E]away.[F#m]
{end_of_chorus}

{start_of_verse}
[D]Voy a escri[A]bir, [E]con nubes tu nom[F#m]bre...
[D]voy a so[A]ñar, [E]con tu cara[F#m]col.
[D]Voy a pe[A]dir, [E]que nunca te va[F#m]llas,
[D]y quiero escu[A]char, [E]mas palabras de a[F#m]mor.
{end_of_verse}

{start_of_chorus}
[D]Run, run, run, runa[A]way, [E]away[F#m]
[D]Run, run, run, runa[A]way, [E]away.[F#m]
{end_of_chorus}

{start_of_verse}
[D]Cuídame bi[A]en, [E]que siempre me pi[F#m]erdo.
[D]Quiero que es[A]tés, [E]a mi lado esta [F#m]vez.
[D]Voy a to[A]mar, [E]tu mano en mi ma[F#m]no,
[D]para for[A]mar [E]un espacio me[F#m]jor.
{end_of_verse}

{start_of_chorus}
[D]Run, run, run, runa[A]way, [E]away[F#m]
[D]Run, run, run, runa[A]way, [E]away.[F#m]
{end_of_chorus}`,
  },
  {
    artistSlug: 'los-pericos',
    songSlug: 'waiting',
    songTitle: 'Waiting',
    content: `{title: Waitin'}
{artist: Los Pericos}

{comment: Acordes}
{start_of_tab}
      D#       A#       G#       Gm       Cm
E-----6--------6--------4--------10-------8----
A-----8--------6--------4--------11-------8----
D-----8--------7--------5--------12-------8----
G-----8--------8--------6--------12-------10---
B-----X--------X--------X---------X--------X---
E-----X--------X--------X---------X--------X---
{end_of_tab}

{start_of_verse}
[D#]I am waiting for your [A#]love,
[G#]leasing faces in my [A#]room
[D#]I am waiting for your [A#]love
[G#]like looking at the [A#]moon, oh, oh
{end_of_verse}

{start_of_bridge}
[Gm]Oh, emo[Cm]tional
[Gm]Devo[Cm]tional.
[G#]give me a greatest love,
[A#]something there is in heaven,
[G#]sometime I just can[A#]
why come we live to[D#]gether now
{end_of_bridge}

{start_of_verse}
I am waiting for your love,
we are playing silly game,
I am waiting for your love,
let me standing in the rain, rain, rain
I am waiting for your love...
{end_of_verse}

{comment: Escala Final}
{start_of_tab}
E---|-----------------------------------|
B---|-----------------------------------|
G---|--8--7--5-----------------------8--|
D---|-----------8--6--5--------------8--|
A---|--------------------8--6--5-5---6--|
E---|-----------------------------------|
{end_of_tab}`,
  },
  {
    artistSlug: 'los-violadores',
    songSlug: 'fuera-de-sektor',
    songTitle: 'Fuera de sektor',
    content: `{title: Fuera de Sektor}
{artist: los Violadores}

{comment: Intro}
[D] [G]
{start_of_tab}
E|-3-2--3-2-|-3-3-2-2-O-O-----------|
B|----------|--------------3--------|
G|----------|-----------------------|
D|----------|-----------------------|
A|----------|-----------------------|
E|----------|-----------------------|
{end_of_tab}

{start_of_verse}
[D]Hoy todo esta fuera de sek[G]tor
[D]talvez no estuvo nunca me[G]jor
[D]nadie regula mi deci[G]sion
[D]nadie trasforma mi satisfac[G]cion
{end_of_verse}

{start_of_chorus}
[A]las luces se adelantan
[G]el cuerpo quiere ceder
[A]aunque no rien ni lloran
[C]todo [G]puede suce[D]der
[C]si tu [G]quieres otra [A]vez
{end_of_chorus}

{start_of_verse}
hoy todo esta fuera de sektor
tu mente esta fuera de control
tu cuerpo esta fuera de formol
hoy todo esta fuera de control
{end_of_verse}

{start_of_verse}
Afuera es noche y brilla en la ciudad
hay gente de verde que siempre busca mas
aunque ya no queda nada en que gastar
demasiada paz y tanta soledad
{end_of_verse}

{start_of_chorus}
las luces se adelantan
el cuerpo quiere ceder
aunque no rien ni lloran
todo puede suceder
como la primera vez
{end_of_chorus}

{start_of_verse}
hoy todo esta fuera de sektor
tu mente esta fuera de control
tu cuerpo esta fuera de formol
hoy todo esta fuera de sektor
{end_of_verse}

{comment: Final}
[D] [G] {comment: varias veces}

{start_of_verse}
fuera fuera fuera
fuera de sektor
{end_of_verse}

[D] [G]
[Em11] [D] {comment: 2}`,
  },
  {
    artistSlug: 'los-violadores',
    songSlug: 'represion',
    songTitle: 'Represion',
    content: `{title: Represión}
{artist: los Violadores}

{comment: Intro}
[A] [D] {comment: x3} [A] [E]

{start_of_verse}
[A]Hermosas tierras de amor y [D]paz
[A]hermosa gente cordiali[D]dad
[A]futbol, asadoy y vi[D]no
[E]Son los [D]gustos del [C#5]pueblo argen[A]tino [D] [A] [D]
{end_of_verse}

{start_of_verse}
Censura vieja y obsoleta
en filmes revistas e historietas
fiestas conchetas y aburridas
donde esta la diversion perdida?
{end_of_verse}

{start_of_chorus}
[E][RE] [G][RE]-pre-[F#]sion, [E][A] [LA] vuelta de tu casa
[E]represion en el quiosco de la esquina
[E]represion en la panaderia
[E]represion [D] veiticuatro [C#5]horas al [A]dia
{end_of_chorus}

{start_of_verse}
Semanas largas sacrificadas
trabajo duro, muy poca paga
desocupados, no pasa nada
donde esta la igualdad deseada?
{end_of_verse}

{start_of_chorus}
Represion, que te aniquila
represion, que no se olvida
represion en nuestras vidas
represion 24 horas al dia
{end_of_chorus}

{start_of_verse}
[A]Yo no [C/D]quiero [A]repre[C/D]sion
[A]detes[C/D]tamos [A][A] [LA] repre[C/D]sion
[A]Nos bur[C/D]lamos [A]de la repre[C/D]sion
Represion....
{end_of_verse}`,
  },
  {
    artistSlug: 'los-violadores',
    songSlug: 'sin-ataduras',
    songTitle: 'Sin ataduras',
    content: `{title: Sin ataduras}
{artist: los Violadores}

{start_of_verse}
[Am]Tengo recuerdos tristes desde un [G]lugar lejano
[C]crudos inviernos en el [E]norte siberiano
[Am]recuerdo un lugar donde [G]todo esta prohibido
[C]desde la critica hasta [E]mas leve suspiro
{end_of_verse}

{start_of_chorus}
[F]Sin ataduras [G]en el este,leyendo a [Em]Engels y a [Am]Marx
[F]sin ataduras [G]en el este,brindando [Em]vodka con ca[Am]viar
[F]sin ataduras [G]en mi mente,yo [Em]solo busco la ver[Am]dad
[F]sin ataduras [G]en mi loco cora[Am]zon
{end_of_chorus}

{start_of_verse}
Tengo recuerdos turbios al norte del Rio Grande
yo fui espalda mojada y supe lo que es el hambre
recuerdo un lugar donde todo es permitido
como cargar armas y matar a los vecinos
{end_of_verse}

{start_of_chorus}
Sin ataduras en el oeste,consumen todo sin parar
sin ataduras en el oeste,pintar de negro el KKK
sin ataduras en mi mente,yo solo busco la verdad
sin ataduras en mi loco corazon
{end_of_chorus}

{start_of_verse}
El mundo esta partido en dos bloques bien distintos
y los pequeños burgueses sirviendo al capitalismo
y los idiotas utiles sirviendo al comunismo
en la loca carrera que lleva al hombre hacia el abismo
{end_of_verse}

{start_of_chorus}
Sin ataduras en el este,leyendo a Engels y a Marx
sin ataduras en el oeste,consumen todo sin parar
sin ataduras en mi mente,yo solo busco la verdad
sin ataduras en mi loco corazon
{end_of_chorus}`,
  },
  {
    artistSlug: 'riff',
    songSlug: 'satiros-sueltos',
    songTitle: 'Satiros sueltos',
    content: `{title: Satiros Sueltos}
{artist: Riff}

{start_of_verse}
[LA]Señora no deje a su hija con los delin[RE]cuentes
[MI]Ellos son distintos y eso no [LA]va
[LA]Hay muchos delincuentes que usan camisa y cor[RE]bata
[MI]Dejan que les brille su traje esco[LA]cés.
{end_of_verse}

{start_of_verse}
Ayer vi pasar a su hija de quince años
Parece que no es la misma desde que se fue
Ahora usa ropa y perfume importado
Y me mira de costado cuando usted no la ve
{end_of_verse}

{comment: Intermedio}
[SOL] [LA] [SOL] [RE]

{comment: Solo}
[LA] [RE] [MI] [LA]

{start_of_verse}
Cruzándola el otro día por el supermercado
Vestía un traje rojo a todo color
Llevaba un carro lleno de bebidas blancas
Se había puesto tacos altos por primera vez
{end_of_verse}

{start_of_chorus}
Que buscan estos villanos con estas princesas
Quizás encuentran en ellas satisfacción,
Satisfacción, satisfacción
Sátiros sueltos, satisfacción
Satisfacción, eh! señora cuide a la nena
Un mono la trataría mejor.
Sátiros sueltos, satisfacción
Animales sueltos, satisfacción.
Satisfaccion, Peyroneles sueltos
un mono...
{end_of_chorus}`,
  },
];

export function getFixtures(): readonly ChordProFixture[] {
  return FIXTURES;
}
