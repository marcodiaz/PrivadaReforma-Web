# Tutorial: Arreglo de `git` y `rg` en Windows para Codex

Este tutorial corrige el problema recurrente en el que Codex no encuentra `git` ni `rg` en cada ventana nueva.

## 1) Causa real (confirmada)

En esta sesión, el `PATH` del proceso de Codex viene recortado y solo trae rutas internas de la app:

- `C:\Users\marco.diaz\.codex\tmp\...`
- `C:\Program Files\WindowsApps\OpenAI.Codex_...\app\resources`

Eso explica por qué fallan comandos básicos (`where`, `git`, `rg`) aunque sí existan en el sistema.

## 2) Lo que ya validamos en esta máquina

- `git` sí está instalado.
- Ruta funcional confirmada: `C:\Progra~1\Git\cmd\git.exe`
- Versión detectada: `git version 2.53.0.windows.1`
- `rg` (ripgrep) no se encontró instalado en rutas comunes.

## 3) Arreglo permanente en Windows (recomendado)

1. Abre `Configuración avanzada del sistema`.
2. Entra a `Variables de entorno`.
3. Edita `Path` (usuario o sistema) y agrega estas entradas si faltan:
   - `C:\Windows\System32`
   - `C:\Windows`
   - `C:\Program Files\Git\cmd`
4. Acepta cambios y cierra.
5. Cierra Codex por completo.
6. Vuelve a abrir Codex (nueva instancia, no solo pestaña nueva).

## 4) Instalar `rg` (ripgrep)

Opciones:

- Con winget:
  - `winget install BurntSushi.ripgrep.MSVC`
- Con Chocolatey:
  - `choco install ripgrep`

Luego valida dónde quedó instalado `rg.exe` y asegúrate de que su carpeta esté en `Path`.

## 5) Validación rápida (después de reiniciar Codex)

Ejecuta en terminal:

```cmd
echo %PATH%
where git
git --version
where rg
rg --version
where where
```

Resultado esperado:

- `where` responde rutas (no error de comando inexistente).
- `git` y `rg` responden versión.

## 6) Mitigación inmediata por sesión (si vuelve a pasar)

Mientras corriges el entorno global, puedes seguir trabajando con rutas absolutas:

```cmd
C:\Progra~1\Git\cmd\git.exe status
```

Y para búsquedas usa alternativas:

```cmd
dir /s /b *.ts
findstr /s /n /i "texto" *.ts
```

## 7) Nota específica de Codex Desktop

Si el `Path` está correcto en Windows pero Codex sigue arrancando con `PATH` mínimo, suele ser por cómo la app hereda variables al iniciar. El reinicio completo de la app tras ajustar `Path` suele resolverlo. Si no, actualiza/reinstala Codex para forzar una nueva captura del entorno.
