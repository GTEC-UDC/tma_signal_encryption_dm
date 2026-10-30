SIGNAL-ENCRYPTING DM-TMA DEMONSTRATOR · EDICION WEB OFFLINE
===========================================================

Demostrador interactivo asociado al paper:

  "Time-Modulated Arrays with Signal Encryption for Enhanced
   Directional Modulation Security"

enviado a IEEE Antennas and Wireless Propagation Letters.
Version en linea: https://gtec-udc.github.io/tma_signal_encryption_dm/

Autores: Roberto Maneiro-Catoira, Julio Bregains,
         Jose A. Garcia-Naya y Luis Castedo.

El paquete funciona completamente en local. No requiere cuenta, conexion a
Internet, Python, MATLAB, Node.js ni ningun servidor externo.

APERTURA DIRECTA · OPCION PRINCIPAL
----------------------------------

1. Descomprima por completo el fichero ZIP en una carpeta local.
2. Abra la carpeta descomprimida.
3. Haga doble clic en index.html.

La aplicacion se abrira en el navegador predeterminado. Todos los calculos se
realizan localmente y no se transmite informacion.

APERTURA OPCIONAL CON VISUAL STUDIO CODE
----------------------------------------

Tambien puede abrir la carpeta en Visual Studio Code y seleccionar "Open with
Live Server" sobre index.html. No es necesario para ejecutar el demostrador,
pero puede resultar util durante su edicion o integracion en otra web.

CONTENIDO
---------

  index.html            Punto de entrada; admite apertura directa.
  app.js                Interfaz y motor numerico autocontenidos.
  styles.css            Presentacion visual y diseno adaptable.
  favicon.svg           Icono local.
  data/model-info.json  Metadatos, ecuaciones y benchmark del paper.
  MANIFEST.json         Tamanos y huellas SHA-256 de la distribucion.

MODELO DEL PAPER
----------------

- Array lineal uniforme de 2N = 20 elementos isotropos.
- Dos armonicos dominantes: omega^(1,1) y omega^(-1,1).
- Patrones complementarios Sigma/Delta con haces en theta_1 = 110 grados y
  theta_2 = 60 grados.
- QPSK a 2 Mbit/s, alpha = 0.25, B_f = 1.25 MHz y f_c = 2.4 GHz.
- f_b = 2 f_a = 2 MHz = 1.6 B_f.
- M = 64 fases equiprobables (multiplo de 4) y T_PR = 2 T_b = T_s = 1 microsegundo.
- SNR de 25 dB, contraste angular de 20.5 dB y capacidad de secreto de
  6.4 bit/s/Hz.
- Eficiencia ideal de modulacion temporal del 66%.

FUNCIONES
---------

- Apuntamiento independiente de ambos armonicos y patrones Sigma/Delta.
- SINR angular, BER QPSK y capacidad de secreto.
- Constelaciones antes y despues del descrambling, incluidos los casos de la
  Fig. 4 y la recepcion sin clave.
- Sensibilidad al error temporal: P_res/P_useful = 2 Delta_t/T_PR antes del
  filtro adaptado y aproximadamente (Delta_t/T_PR)^2 despues de el.
- Arquitectura del elemento n-esimo y tabla de D_n^1,...,D_n^4.
- Espectro armonico, margen de separacion, componente degenerada y eficiencia.
- Exportacion local de datos angulares CSV y del escenario JSON.

ALCANCE
-------

Es un modelo analitico de factor de array con excitacion uniforme, elementos
isotropos, conmutadores ideales y receptor coherente sincronizado. No incorpora
acoplamiento mutuo, perdidas RF ni no idealidades de los conmutadores. La
cuantizacion de retardos se ofrece como extension opcional al modelo del paper.

Version 1.0 · Demostrador web offline del paper.
Tutorial: docs/TUTORIAL.md en https://github.com/GTEC-UDC/tma_signal_encryption_dm
