import Link from 'next/link'

export default function StitchIndex() {
  return (
    <div className="p-8 text-zinc-100 bg-background min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Stitch UI Exports</h1>
      <ul className="space-y-2">
        <li>
          <Link
            href="/stitch/alchemical_labs_transmuted_record"
            className="text-alchemical-spirit hover:underline"
          >
            AlchemicalLabsTransmutedRecord
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/alchemical_labs_transmuted_record_economy_edition"
            className="text-alchemical-spirit hover:underline"
          >
            AlchemicalLabsTransmutedRecordEconomyEdition
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/alchemical_ui_feedback_error_states"
            className="text-alchemical-spirit hover:underline"
          >
            AlchemicalUiFeedbackErrorStates
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/consciousness_council_active_debate"
            className="text-alchemical-spirit hover:underline"
          >
            ConsciousnessCouncilActiveDebate
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/consciousness_council_alchemical_synthesis"
            className="text-alchemical-spirit hover:underline"
          >
            ConsciousnessCouncilAlchemicalSynthesis
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/consciousness_council_assembly_view"
            className="text-alchemical-spirit hover:underline"
          >
            ConsciousnessCouncilAssemblyView
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/forge_ignition_sequence"
            className="text-alchemical-spirit hover:underline"
          >
            ForgeIgnitionSequence
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/forge_knowledge_infusion"
            className="text-alchemical-spirit hover:underline"
          >
            ForgeKnowledgeInfusion
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/forge_wizard_engine_tier_selection"
            className="text-alchemical-spirit hover:underline"
          >
            ForgeWizardEngineTierSelection
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/forge_wizard_name_the_vessel"
            className="text-alchemical-spirit hover:underline"
          >
            ForgeWizardNameTheVessel
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/forge_wizard_spacetime_coordinates"
            className="text-alchemical-spirit hover:underline"
          >
            ForgeWizardSpacetimeCoordinates
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/jing_arena_active_duel_chat"
            className="text-alchemical-spirit hover:underline"
          >
            JingArenaActiveDuelChat
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/jing_arena_synastry_pairing"
            className="text-alchemical-spirit hover:underline"
          >
            JingArenaSynastryPairing
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/jing_arena_token_economy_sacred_stats"
            className="text-alchemical-spirit hover:underline"
          >
            JingArenaTokenEconomySacredStats
          </Link>
        </li>
        <li>
          <Link
            href="/stitch/the_vault_empty_state"
            className="text-alchemical-spirit hover:underline"
          >
            TheVaultEmptyState
          </Link>
        </li>
      </ul>
    </div>
  )
}
