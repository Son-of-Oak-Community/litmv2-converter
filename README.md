# LitM Converter

Convert official **Legend in the Mist** content you own—published for the official *Legend in the Mist* Foundry system (`mist-engine-fvtt`)—into content for the unofficial **[litmv2](https://github.com/Son-of-Oak-Community/litmv2)** system.

This module ships **no game content**. It reads the official modules you have purchased and installed, converts their documents locally on your machine, and imports the result into its own compendium packs. You must own the official modules for the converter to have anything to convert.

## What you get

After running the converter, the compendium sidebar gains a **Legend in the Mist** folder with one subfolder per official module you own:

| Official module | Converted compendia |
| --- | --- |
| Legend In The Mist — Core Book | Actors, Rulebooks (journals), Themebooks, Themekits, Vignettes & Add-ons, Tropes, Oracle Tables, Rotes (as litmv2 actions) |
| Legend In The Mist — Character Pack | Pre-made character Actors |
| Legend In The Mist — Hearts of Ravendale | *The Dale* adventure (scenes, journals, NPCs), Themekits, Challenge Add-ons, Tropes |

The Core Book's *Quintessences* have no litmv2 equivalent and are currently not converted. Pack banner images are copied from the Core Book module during export, so they appear after your first export (and stay even if you later remove the source modules).

## Requirements

- Foundry VTT **v14 or later**
- The official **Legend in the Mist** system (`mist-engine-fvtt`) installed
- The **litmv2** system installed
- At least one official Legend in the Mist module purchased and installed (Core Book, Character Pack, and/or Hearts of Ravendale)
- Both worlds (export and import) must live on the **same Foundry installation** (the converter hands data between them through its own module folder)

## Installation

In Foundry's **Add-on Modules** tab, choose **Install Module** and paste this manifest URL:

```
https://raw.githubusercontent.com/Son-of-Oak-Community/litmv2-converter/main/module.json
```

The module installs straight from this repository's `main` branch — there are no versioned releases. To pick up a newer build later, use **Update** in Foundry's module management (or reinstall from the same URL).

## Usage

The conversion is a two-step round trip: **export** from a world running the official system, then **import** in a world running litmv2.

### Step 1 - Export (official system world)

1. Create (or open) a world that uses the official **Legend in the Mist** system.
2. In that world, enable your official module(s) **and** *LitM Converter*.
3. Log in as Gamemaster. The converter detects your official modules and asks whether to export their content.
4. Confirm and wait for the progress bar to finish. The converted data is written into the converter's module folder, where every world on this installation can read it.

### Step 2 -Import (litmv2 world)

1. Create (or open) a world that uses the **litmv2** system.
2. Log in as Gamemaster. The converter finds the exported data and asks whether to import it.
3. Enable *LitM Converter* in the module list.
4. Confirm, wait for the progress bar, then **reload** when prompted.
5. The converted content now lives in this module's compendium packs (The content is therefore available to *every* litmv2 world on this Foundry installation that enables the module).

### Step 3 - Play

- Browse the compendia from the **Compendium Packs** sidebar tab.
- Set the correct compendium packs to use in the litmv2 **Hero** creation tool (Tropes, Themekits, and Themebooks).
- For **Hearts of Ravendale**, open the *LitM Hearts of Ravendale—The Dale* pack and import the adventure into your world from there.
- **Keep the official modules — and the official system — installed.** Scene maps and artwork are loaded directly from their folders, and some rulebook pages (the Ways of Magic) use heading art from the `mist-engine-fvtt` system folder (nothing needs to be *enabled* in your litmv2 world — just installed). Uninstalling them breaks images in the converted content.

## Updating converted content

When an official module or the converter itself gets an update, re-run the conversion:

1. In your **official-system** world: *Settings → Configure Settings → LitM Converter → Update Content* (re-exports everything).
2. In your **litmv2** world: the same *Update Content* button (deletes the converter's compendia and re-imports from the fresh export).

Documents you already imported into a world (e.g. the Hearts of Ravendale adventure) are not touched by a re-import (you'll have to re-import the adventure itself to update the content in your world).

## Troubleshooting

- **"No handoff manifest found"** when importing - run the export first (Step 1), in a world on the same Foundry installation.
- **"…was produced by an older converter version"** - re-run the export via *Update Content* in your official-system world, then import again.
- **No prompt appears on login** - prompts only show for Gamemasters, and only when there is something new to do (an un-exported module, or empty compendia). Use *Update Content* in the module settings to run either step manually.
- **Missing maps or artwork in the litmv2 world** - the official source modules were uninstalled; reinstall them.

## Legal

*Legend in the Mist* and all its content are © Son of Oak Game Studio. This module contains no official content and grants access to none, it converts content you have purchased, locally, for your own use. This is an unofficial community project and is not affiliated with Son of Oak Game Studio.
