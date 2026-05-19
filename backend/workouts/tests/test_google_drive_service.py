from workouts.google_drive_service import (
    build_drive_map,
    extract_folder_id,
    normalize_drive_match_key,
    parse_public_drive_folder_html,
)


def test_extract_folder_id_from_shared_url():
    folder_id = "1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG"

    assert extract_folder_id(f"https://drive.google.com/drive/folders/{folder_id}?usp=sharing") == folder_id
    assert extract_folder_id(f"https://drive.google.com/embeddedfolderview?id={folder_id}#list") == folder_id
    assert extract_folder_id(folder_id) == folder_id


def test_parse_public_drive_folder_html_reads_flip_entries():
    html = """
    <div class="flip-entry" id="entry-1g8xvzPVSm9IixCdFQYb_TFjBgQzyg1L0" tabindex="0">
      <div class="flip-entry-info"><a href="https://drive.google.com/file/d/1g8xvzPVSm9IixCdFQYb_TFjBgQzyg1L0/view"></a></div>
      <div class="flip-entry-title">CURL de B&Iacute;CEPS BAYESIAN.MOV</div>
    </div>
    <div class="flip-entry" id="entry-1NotAVideoFileInTheFolder123456" tabindex="0">
      <div class="flip-entry-title">Notas entrenamiento.pdf</div>
    </div>
    """

    videos = parse_public_drive_folder_html(html)

    assert videos == [{
        "name": "Curl De Bíceps Bayesian",
        "file_id": "1g8xvzPVSm9IixCdFQYb_TFjBgQzyg1L0",
        "filename": "CURL de BÍCEPS BAYESIAN.MOV",
    }]


def test_build_drive_map_matches_exercise_name_with_accents_and_extension():
    videos = [{
        "filename": "CURL de BÍCEPS BAYESIAN.MOV",
        "file_id": "1g8xvzPVSm9IixCdFQYb_TFjBgQzyg1L0",
    }]

    drive_map = build_drive_map(videos)

    assert drive_map[normalize_drive_match_key("Curl de Biceps Bayesian")] == "1g8xvzPVSm9IixCdFQYb_TFjBgQzyg1L0"
