// Message Template System for Spectator Interactions
// All spectator messages must use these predefined templates

export const REACTION_TYPES = {
    CLAP: 'clap',
    FIRE: 'fire',
    SUPPORT: 'support',
    WOW: 'wow',
} as const;

export const REACTION_EMOJIS = {
    clap: '👏',
    fire: '🔥',
    support: '💪',
    wow: '😮',
} as const;

export const MESSAGE_TEMPLATES = {
    team_support: "Come on {{team}}!",
    player_support: "Let's go {{player}}!",
    big_moment: "Big moment for {{player}} 🔥",
    need_wicket: "We need a wicket, {{team}}!",
    well_played: "Well played {{player}} 👏",
} as const;

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];
export type MessageTemplateKey = keyof typeof MESSAGE_TEMPLATES;

/**
 * Renders a message template with actual team/player names
 * @param templateKey - The template key to render
 * @param data - Object containing team and/or player names
 * @returns Rendered message string
 */
export function renderMessageTemplate(
    templateKey: MessageTemplateKey,
    data: { team?: string; player?: string }
): string {
    const template: string = MESSAGE_TEMPLATES[templateKey];

    let rendered = template;

    if (data.team) {
        rendered = rendered.replace('{{team}}', data.team);
    }

    if (data.player) {
        rendered = rendered.replace('{{player}}', data.player);
    }

    return rendered;
}

/**
 * Gets the display name for a reaction type
 * @param reaction - The reaction type
 * @returns Emoji representation
 */
export function getReactionEmoji(reaction: ReactionType): string {
    return REACTION_EMOJIS[reaction];
}

/**
 * Validates if a template key is allowed
 * @param key - The template key to validate
 * @returns True if valid, false otherwise
 */
export function isValidTemplateKey(key: string): key is MessageTemplateKey {
    return key in MESSAGE_TEMPLATES;
}

/**
 * Validates if a reaction type is allowed
 * @param reaction - The reaction to validate
 * @returns True if valid, false otherwise
 */
export function isValidReaction(reaction: string): reaction is ReactionType {
    return Object.values(REACTION_TYPES).includes(reaction as ReactionType);
}
