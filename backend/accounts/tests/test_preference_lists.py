from accounts.preference_lists import unwrap_string_list
from accounts.serializers import FlexibleStringListField


def test_unwrap_keeps_clean_spanish_labels():
    assert unwrap_string_list(["Vegano", "Intolerancia a la lactosa", "Celíaco"]) == [
        "Vegano",
        "Intolerancia a la lactosa",
        "Celíaco",
    ]


def test_unwrap_json_array_string():
    assert unwrap_string_list('["Vegano", "Intolerancia a la lactosa", "celíaco"]') == [
        "Vegano",
        "Intolerancia a la lactosa",
        "celíaco",
    ]


def test_unwrap_python_repr_string():
    assert unwrap_string_list("['Vegano', 'Intolerancia a la lactosa', 'celíaco']") == [
        "Vegano",
        "Intolerancia a la lactosa",
        "celíaco",
    ]


def test_unwrap_comma_split_fragments():
    mangled = ["['Vegano'", "'Intolerancia a la lactosa'", "'celíaco']"]
    assert unwrap_string_list(mangled) == [
        "Vegano",
        "Intolerancia a la lactosa",
        "celíaco",
    ]


def test_unwrap_reported_double_encoded_shape():
    mangled = ['["[\'Vegano\'"', '"\'Intolerancia a la lactosa\'"', '"\'celíaco\']"]']
    assert unwrap_string_list(mangled) == [
        "Vegano",
        "Intolerancia a la lactosa",
        "celíaco",
    ]


def test_flexible_field_round_trips_mangled_input():
    field = FlexibleStringListField()
    mangled = "['Vegano', 'Intolerancia a la lactosa', 'celíaco']"
    internal = field.to_internal_value(mangled)
    assert internal == ["Vegano", "Intolerancia a la lactosa", "celíaco"]
    assert field.to_representation(mangled) == internal
    assert field.to_representation(internal) == internal
