# Pauso · Cuestionarios de la fase 1

Páginas estáticas de Taltalab para que el equipo de Pauso responda hablando o por escrito. Mismo diseño y funciones que los de Studio Roses.

- Una carpeta por persona: `nacho/`, `maria/`, `fran/`, `eli/`, `tita/`, `juan-luis/`, `peter/`, `blanca/`. La portada (`index.html`) enlaza a todas.
- Una pregunta por pantalla, barra de progreso, micro en la propia página (graba el audio y, en Chrome, lo transcribe en directo).
- Todo se guarda solo en el navegador de quien responde. Al final se envía por WhatsApp, por correo (a joe@ y diego@taltalab.net) o como .zip con los audios.
- Sin servidor ni base de datos. Para regenerar: `python3 plantilla/generar.py pauso.json web`.
