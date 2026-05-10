require('dotenv').config();

//Wyciągnięcie konkretnych klas, obiektów i stałych z biblioteki discord.js
//Zamiast pisać za każdym razem discord.js.Client czy discord.js.ButtonStyle można użyć Client oraz ButtonStyle
const
{
  //Client - Główna klasa bota, która pozwala mu łączyć się z API Discorda.
  Client
  //GatewayIntentBits - Służy do określania "Intencji" (Intents). 
  // Musisz tu zadeklarować, do jakich danych bot ma mieć dostęp (np. czy ma widzieć treść wiadomości, czy listę członków).
  , GatewayIntentBits
  , PermissionsBitField
  , ChannelType
  , ActionRowBuilder
  , ButtonBuilder
  , ButtonStyle
  , EmbedBuilder
  //Events - Lista zdarzeń, na które bot może reagować (np. ClientReady, MessageCreate).
  , Events

  //Tworzenie Komend i Interakcji
  //REST i Routes - wykorzystywane do "rejestrowania" (wysyłania) stworzonych komend do serwerów Discorda, aby użytkownicy mogli je zobaczyć.
  , REST
  , Routes
  //SlashCommandBuilder - Narzędzie do definiowania komend typu "Slash" (tych zaczynających się od /).
  , SlashCommandBuilder
  , MessageFlags
} = require('discord.js');

// ===== Client =====
//Zdefiniowanie klienta
const client = new Client
(
  {
    intents:
    [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  }
);

// ===== SLASH COMMAND =====
//Definiowania komend typu "Slash" (tych zaczynających się od /).
const commands = 
[
  new SlashCommandBuilder()
    .setName('scrim')
    .setDescription('Stwórz scrima')
    //--------------------------------------
    .addStringOption
    (
        option => option
        .setName('team_abcd')
        .setDescription('Nazwa teamu')
        .setRequired(true)
    )
    //--------------------------------------
    .addStringOption
    (
        option => option
        .setName('time')
        .setDescription('Godzina scrima')
        .setRequired(true)
    )
    //--------------------------------------
    .addStringOption
    (
        option => option
        .setName('format')
        .setDescription('Format meczu')
        .setRequired(true)
        .addChoices
        (
          { name: 'BO3', value: 'BO3' },
          { name: 'BO5', value: 'BO5' },
          { name: 'BO7', value: 'BO7' }
        )
    ),
].map(command => command.toJSON());

// ===== REST =====
//"Rejestrowania" (wysyłania) stworzonych komend do serwerów Discorda, aby użytkownicy mogli je zobaczyć.
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(
    async () =>
    {
      try
      {
        console.log('Rejestracja komend...');

        await rest.put
        (
            Routes.applicationGuildCommands
            (
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );
        console.log('Komendy gotowe');
      } catch (error)
      {
        console.error(error);
      }
    }
)();

// ===== READY =====

client.once
(
    Events.ClientReady, c =>
    {
        console.log(`Zalogowano jako ${c.user.tag}`);
    }
);

// ===== COMMAND HANDLER =====
//Funkcja odpowiadająca na zdażenie ON
client.on(Events.InteractionCreate, async interaction => 
{
  // ===== SLASH COMMAND =====
  if (interaction.isChatInputCommand())
    {
        if (interaction.commandName === 'scrim')
        {
            const team = interaction.options.getString('team');
            const time = interaction.options.getString('time');
            const format = interaction.options.getString('format');

        const embed = new EmbedBuilder()
        .setTitle('🔥 Nowy Scrim')
        .setDescription
        (`
**Team:** ${team}
**Godzina:** ${time}
**Format:** ${format}
**Kapitan:** ${interaction.user}
        `)
        .setColor('Blue');

      const button = new ButtonBuilder()
        .setCustomId(`accept_${interaction.user.id}_${team}`)
        .setLabel('Accept Scrim')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply
        (
            {
                embeds: [embed],
                components: [row],
            }
        );
        }
  }
   // ===== BUTTON =====
  if (interaction.isButton())
  {
    if (interaction.customId.startsWith('accept_'))
    {
      const split = interaction.customId.split('_');

      const ownerId = split[1];
      const teamName = split[2];

      if (interaction.user.id === ownerId)
      {
        return interaction.reply
        (
          {
            content: 'Nie możesz zaakceptować własnego scrima.',
            ephemeral: true,
          }
        );
      }

      const guild = interaction.guild;

      const channelName = `scrim-${teamName}-vs-${interaction.user.username}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');


      //Automatyczne stworzenie nowego kanału tekstowego
      const channel = await guild.channels.create //Ta funkcja mówi botowi: "Stwórz nowy kanał na tym serwerze".
      (
        {
          name: channelName, //Nadaje kanałowi nazwę (przechowywaną pod zmienną channelName).
          type: ChannelType.GuildText, //Określa, że ma to być zwykły kanał tekstowy (a nie np. głosowy czy forum).
          permissionOverwrites: //Zarządzanie uprawnieniami
          [
            {
              id: guild.roles.everyone,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: ownerId,
              allow:
              [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
            {
              id: interaction.user.id,
              allow:
              [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
          ],
        }
      );

      await channel.send
      (`
        🏆 Scrim utworzony!
        Team 1: <@${ownerId}>
        Team 2: ${interaction.user}

        Powodzenia 🔥
              `
      );

      await interaction.reply
      (
        {
          content: `Scrim zaakceptowany! Kanał: ${channel}`,
          flags: MessageFlags.Ephemeral
          //ephemeral: true, //<-- Stara instrukcja powodująca ostrzrzenie
        }
      );
    }
  }
}
); //koniec client.on(Events.InteractionCreate, async interaction => ...

client.login(process.env.TOKEN);
