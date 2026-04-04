import { SettingGroup } from './SettingGroup';

export default function App() {
  // Appearance
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [uiScale, setUiScale] = useState(1.0);
  const [accentColor, setAccentColor] = useState([0.2, 0.5, 1.0, 1.0]);
  const [theme, setTheme] = useState(0);

  // Editor
  const [autoSave, setAutoSave] = useState(true);
  const [tabSize, setTabSize] = useState(4);
  const [wordWrap, setWordWrap] = useState(false);
  const [language, setLanguage] = useState(0);
  const [projectName, setProjectName] = useState("My Project");

  // Performance
  const [maxFps, setMaxFps] = useState(60);
  const [renderQuality, setRenderQuality] = useState(2);
  const [vsync, setVsync] = useState(true);
  const [lodBias, setLodBias] = useState(0.0);

  // Audio
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.6);
  const [sfxVolume, setSfxVolume] = useState(1.0);
  const [muteAll, setMuteAll] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <DockSpace>
      <MenuBar>
        <Menu label="File">
          <MenuItem label="Save Settings" shortcut="Ctrl+S" />
          <MenuItem label="Load Defaults" onPress={() => setShowResetConfirm(true)} />
          <Separator />
          <MenuItem label="Exit" />
        </Menu>
        <Menu label="Help">
          <MenuItem label="Documentation" />
          <MenuItem label="About" />
        </Menu>
      </MenuBar>

      <Window title="Settings">
        <TabBar>
          <TabItem label="Appearance">
            <Column gap={6}>
              <Text style={{ fontSize: 18 }}>Appearance Settings</Text>
              <Separator />
              <Checkbox label="Dark Mode" value={darkMode} onChange={setDarkMode} />
              <SliderInt label="Font Size" value={fontSize} onChange={setFontSize} min={8} max={32} />
              <SliderFloat label="UI Scale" value={uiScale} onChange={setUiScale} min={0.5} max={3.0} />
              <ColorEdit label="Accent Color" value={accentColor} onChange={setAccentColor} />
              <Combo label="Theme" value={theme} onChange={setTheme} items={["Default", "Solarized", "Monokai", "Nord"]} />
            </Column>
          </TabItem>

          <TabItem label="Editor">
            <Column gap={6}>
              <Text style={{ fontSize: 18 }}>Editor Settings</Text>
              <Separator />
              <TextInput label="Project Name" value={projectName} onChange={setProjectName} />
              <Checkbox label="Auto Save" value={autoSave} onChange={setAutoSave} />
              <Checkbox label="Word Wrap" value={wordWrap} onChange={setWordWrap} />
              <SliderInt label="Tab Size" value={tabSize} onChange={setTabSize} min={1} max={8} />
              <Combo label="Language" value={language} onChange={setLanguage} items={["English", "Turkish", "German", "French", "Japanese"]} />
            </Column>
          </TabItem>

          <TabItem label="Performance">
            <Column gap={6}>
              <Text style={{ fontSize: 18 }}>Performance Settings</Text>
              <Separator />
              <Checkbox label="VSync" value={vsync} onChange={setVsync} />
              <SliderInt label="Max FPS" value={maxFps} onChange={setMaxFps} min={30} max={240} />
              <Combo label="Render Quality" value={renderQuality} onChange={setRenderQuality} items={["Low", "Medium", "High", "Ultra"]} />
              <DragFloat label="LOD Bias" value={lodBias} onChange={setLodBias} speed={0.01} />
              <Separator />
              <Text>Current FPS: 60</Text>
              <ProgressBar value={0.6} overlay="GPU: 60%" />
            </Column>
          </TabItem>

          <TabItem label="Audio">
            <Column gap={6}>
              <Text style={{ fontSize: 18 }}>Audio Settings</Text>
              <Separator />
              <Checkbox label="Mute All" value={muteAll} onChange={setMuteAll} />
              {!muteAll && <Column gap={4}>
                <SliderFloat label="Master Volume" value={masterVolume} onChange={setMasterVolume} min={0} max={1} />
                <SliderFloat label="Music Volume" value={musicVolume} onChange={setMusicVolume} min={0} max={1} />
                <SliderFloat label="SFX Volume" value={sfxVolume} onChange={setSfxVolume} min={0} max={1} />
              </Column>}
            </Column>
          </TabItem>
        </TabBar>
      </Window>

      <Window title="Preview">
        <Column gap={4}>
          <Text>Live Preview</Text>
          <Separator />
          <Table columns={["Setting", "Value"]}>
            <TableRow>
              <Text>Theme</Text>
              <Text>{darkMode ? "Dark" : "Light"}</Text>
            </TableRow>
            <TableRow>
              <Text>Font Size</Text>
              <Text>{fontSize}</Text>
            </TableRow>
            <TableRow>
              <Text>VSync</Text>
              <Text>{vsync ? "On" : "Off"}</Text>
            </TableRow>
          </Table>
          <Separator />
          <Row gap={8}>
            <Button title="Apply" onPress={() => setShowResetConfirm(false)} />
            <Button title="Reset" onPress={() => setShowResetConfirm(true)} />
          </Row>
        </Column>
      </Window>

      {showResetConfirm && <Window title="Confirm Reset">
        <Column gap={8}>
          <Text>Are you sure you want to reset all settings to defaults?</Text>
          <Row gap={8}>
            <Button title="Yes, Reset" onPress={() => setShowResetConfirm(false)} />
            <Button title="Cancel" onPress={() => setShowResetConfirm(false)} />
          </Row>
        </Column>
      </Window>}
    </DockSpace>
  );
}
